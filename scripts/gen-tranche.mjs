// Synchronous content generation for a tranche of posts (immediate preprod).
// Usage:
//   node scripts/gen-tranche.mjs --limit 24            # first 24 not-yet-done
//   node scripts/gen-tranche.mjs --slug my-slug        # single post
//   node scripts/gen-tranche.mjs --all --concurrency 6 # everything, sync
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateArticle } from './lib/openai.mjs';
import { pool } from './lib/util.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/content');

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const has = (name) => args.includes(`--${name}`);

const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  const raw = JSON.parse(await readFile(resolve(ROOT, 'data/raw-posts.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });

  let targets = raw;
  const slug = getArg('slug');
  if (slug) targets = raw.filter((p) => p.slug === slug);

  // Skip already generated unless --force
  if (!has('force')) {
    const filtered = [];
    for (const p of targets) {
      if (!(await exists(resolve(OUT, `${p.slug}.json`)))) filtered.push(p);
    }
    targets = filtered;
  }

  if (!has('all') && !slug) {
    const limit = parseInt(getArg('limit', '24'), 10);
    targets = targets.slice(0, limit);
  }

  const concurrency = parseInt(getArg('concurrency', '5'), 10);
  console.log(`Generating ${targets.length} article(s), concurrency ${concurrency}…`);

  let ok = 0, fail = 0;
  let inTok = 0, outTok = 0;
  await pool(targets, concurrency, async (post) => {
    try {
      const { article, usage } = await generateArticle(post);
      article.__slug = post.slug;
      await writeFile(resolve(OUT, `${post.slug}.json`), JSON.stringify(article, null, 2));
      ok++;
      if (usage) { inTok += usage.input_tokens || 0; outTok += usage.output_tokens || 0; }
      console.log(`  ✓ ${post.slug}  (${ok}/${targets.length})`);
    } catch (err) {
      fail++;
      console.warn(`  ✗ ${post.slug}: ${err.message}`);
    }
  });

  console.log(`\nDone: ${ok} ok, ${fail} failed.`);
  console.log(`Tokens — input: ${inTok.toLocaleString()}, output: ${outTok.toLocaleString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
