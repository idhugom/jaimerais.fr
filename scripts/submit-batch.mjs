// Upload batch input files and create OpenAI batches (Responses API endpoint).
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BATCH = resolve(ROOT, 'data/batch');
const API = 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;

const exists = (p) => access(p).then(() => true).catch(() => false);

async function uploadFile(path, name) {
  const buf = await readFile(path);
  const form = new FormData();
  form.append('purpose', 'batch');
  form.append('file', new Blob([buf], { type: 'application/jsonl' }), name);
  const res = await fetch(`${API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`file upload failed: ${JSON.stringify(data)}`);
  return data.id;
}

async function createBatch(fileId) {
  const res = await fetch(`${API}/batches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_file_id: fileId,
      endpoint: '/v1/responses',
      completion_window: '24h',
      metadata: { project: 'jaimerais', purpose: 'content-rewrite' },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`batch create failed: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const manifest = JSON.parse(await readFile(resolve(BATCH, 'manifest.json'), 'utf8'));
  const statePath = resolve(BATCH, 'batches.json');
  const state = (await exists(statePath)) ? JSON.parse(await readFile(statePath, 'utf8')) : [];
  const submitted = new Set(state.map((b) => b.file));

  let failures = 0;
  for (const entry of manifest) {
    if (submitted.has(entry.file)) { console.log(`skip ${entry.file} (already submitted)`); continue; }
    try {
      console.log(`Uploading ${entry.file}…`);
      const fileId = await uploadFile(resolve(BATCH, entry.file), entry.file);
      console.log(`  file id ${fileId}; creating batch…`);
      const batch = await createBatch(fileId);
      state.push({ file: entry.file, count: entry.count, input_file_id: fileId, batch_id: batch.id, status: batch.status });
      await writeFile(statePath, JSON.stringify(state, null, 2));
      console.log(`  ✓ batch ${batch.id} (${batch.status})`);
    } catch (err) {
      failures++;
      console.warn(`  ✗ ${entry.file}: ${err.message}`);
      // Likely an enqueued-token limit — stop; remaining files can be submitted later.
      if (/token|limit|quota|enqueued/i.test(err.message)) {
        console.warn('  (queue limit reached — submit the rest after some batches complete)');
        break;
      }
    }
  }
  console.log(`\n${state.length} batch(es) tracked; ${failures} failed this run.`);

  console.log(`\n${state.length} batch(es) tracked in data/batch/batches.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
