// Build OpenAI Batch API input files (JSONL) for the full content rewrite.
// One request per post that does NOT already have generated content.
// Chunked to stay under per-batch enqueued-token limits.
import { mkdir, writeFile, readFile, access, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestBodyFor } from './lib/openai.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = resolve(ROOT, 'data/content');
const BATCH = resolve(ROOT, 'data/batch');

const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(`--${n}`); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const CHUNK = parseInt(getArg('chunk', '250'), 10);

const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  const raw = JSON.parse(await readFile(resolve(ROOT, 'data/raw-posts.json'), 'utf8'));
  await mkdir(BATCH, { recursive: true });

  const done = new Set();
  if (await exists(CONTENT)) {
    for (const f of await readdir(CONTENT)) if (f.endsWith('.json')) done.add(f.replace(/\.json$/, ''));
  }

  const todo = raw.filter((p) => !done.has(p.slug));
  console.log(`${raw.length} posts, ${done.size} already generated, ${todo.length} to batch.`);

  const chunks = [];
  for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

  const manifest = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const lines = chunks[ci].map((post) =>
      JSON.stringify({
        custom_id: post.slug,
        method: 'POST',
        url: '/v1/responses',
        body: requestBodyFor(post),
      }),
    );
    const name = `input-${String(ci).padStart(3, '0')}.jsonl`;
    await writeFile(resolve(BATCH, name), lines.join('\n') + '\n');
    manifest.push({ file: name, count: lines.length });
    console.log(`  wrote ${name} (${lines.length} requests)`);
  }

  await writeFile(resolve(BATCH, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nBuilt ${chunks.length} batch file(s). Total requests: ${todo.length}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
