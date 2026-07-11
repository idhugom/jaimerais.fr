// Poll batches and ingest completed results into data/content/<slug>.json.
// Safe to run repeatedly. Prints a status summary; exits 0 when all terminal.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractJson } from './lib/openai.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BATCH = resolve(ROOT, 'data/batch');
const CONTENT = resolve(ROOT, 'data/content');
const API = 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;

const exists = (p) => access(p).then(() => true).catch(() => false);
const authGet = (url) => fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });

async function getBatch(id) {
  const res = await authGet(`${API}/batches/${id}`);
  return res.json();
}

async function ingestOutput(fileId) {
  const res = await authGet(`${API}/files/${fileId}/content`);
  const text = await res.text();
  let ok = 0, bad = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const slug = rec.custom_id;
    const body = rec.response?.body;
    if (!slug || !body) { bad++; continue; }
    const article = extractJson(body);
    if (!article) { bad++; console.warn(`  ! no JSON for ${slug}`); continue; }
    article.__slug = slug;
    await writeFile(resolve(CONTENT, `${slug}.json`), JSON.stringify(article, null, 2));
    ok++;
  }
  return { ok, bad };
}

async function main() {
  const statePath = resolve(BATCH, 'batches.json');
  if (!(await exists(statePath))) { console.log('No batches.json — nothing to ingest.'); return; }
  await mkdir(CONTENT, { recursive: true });
  const state = JSON.parse(await readFile(statePath, 'utf8'));

  let allTerminal = true;
  for (const b of state) {
    const info = await getBatch(b.batch_id);
    b.status = info.status;
    const counts = info.request_counts || {};
    console.log(`${b.file} [${b.batch_id}] -> ${info.status}  (done ${counts.completed || 0}/${counts.total || b.count}, failed ${counts.failed || 0})`);

    if (info.status === 'completed' && info.output_file_id && !b.ingested) {
      const r = await ingestOutput(info.output_file_id);
      b.ingested = true;
      console.log(`  ingested ${r.ok} articles (${r.bad} problem lines)`);
      if (info.error_file_id) {
        const er = await authGet(`${API}/files/${info.error_file_id}/content`);
        await writeFile(resolve(BATCH, `errors-${b.file}.jsonl`), await er.text());
        console.log(`  wrote error file errors-${b.file}.jsonl`);
      }
    }
    if (!['completed', 'failed', 'expired', 'cancelled'].includes(info.status)) allTerminal = false;
  }

  await writeFile(statePath, JSON.stringify(state, null, 2));
  const genCount = (await import('node:fs')).readdirSync(CONTENT).filter((f) => f.endsWith('.json')).length;
  console.log(`\nGenerated articles on disk: ${genCount}`);
  console.log(allTerminal ? 'ALL BATCHES TERMINAL.' : 'Some batches still processing.');
  process.exit(allTerminal ? 0 : 3);
}

main().catch((e) => { console.error(e); process.exit(1); });
