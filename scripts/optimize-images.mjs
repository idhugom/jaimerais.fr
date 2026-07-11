// Download every featured image from WordPress and store optimized, self-hosted
// WebP copies under public/images/posts/. Once DNS points to Cloudflare Pages the
// original wp-content URLs stop resolving, so the site must own its images.
//
// Two sizes per post:
//   <slug>.webp        -> 1280w  (article hero + social/OG)
//   <slug>.thumb.webp  ->  680w  (cards / listing)
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { fetchBuffer, pool } from './lib/util.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/images/posts');
const FORCE = process.argv.includes('--force');

const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  const catalog = JSON.parse(await readFile(resolve(ROOT, 'data/posts.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });
  const withImg = catalog.filter((p) => p.image);
  console.log(`Optimizing ${withImg.length} featured images…`);

  let done = 0, skipped = 0, failed = 0;
  await pool(withImg, 8, async (post) => {
    const hero = resolve(OUT, `${post.slug}.webp`);
    const thumb = resolve(OUT, `${post.slug}.thumb.webp`);
    if (!FORCE && (await exists(hero)) && (await exists(thumb))) {
      skipped++;
      return;
    }
    try {
      const buf = await fetchBuffer(post.image.remote);
      const base = sharp(buf, { failOn: 'none' }).rotate();
      await base
        .clone()
        .resize({ width: 1280, height: 853, fit: 'cover', position: 'attention', withoutEnlargement: true })
        .webp({ quality: 74, effort: 4 })
        .toFile(hero);
      await base
        .clone()
        .resize({ width: 680, height: 453, fit: 'cover', position: 'attention', withoutEnlargement: true })
        .webp({ quality: 70, effort: 4 })
        .toFile(thumb);
      done++;
      if (done % 50 === 0) console.log(`  ${done} done (${skipped} cached)…`);
    } catch (err) {
      failed++;
      console.warn(`  ! failed ${post.slug}: ${err.message}`);
    }
  });

  console.log(`\nImages: ${done} optimized, ${skipped} cached, ${failed} failed.`);
  if (failed) {
    await writeFile(
      resolve(ROOT, 'data/image-failures.json'),
      JSON.stringify(withImg.filter((p) => p).map((p) => p.slug), null, 2),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
