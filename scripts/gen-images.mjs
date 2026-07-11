// Generate ultra-realistic featured images (gpt-image-2) for posts that have
// no usable image, plus a branded default OG image. Saves optimized WebP and
// updates data/posts.json so the catalog points to the new local files.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { pool, sleep } from './lib/util.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/images/posts');
const API = 'https://api.openai.com/v1/images/generations';
const KEY = process.env.OPENAI_API_KEY;

const exists = (p) => access(p).then(() => true).catch(() => false);

function promptFor(title) {
  return `Photographie éditoriale ultra réaliste et haut de gamme illustrant le sujet : « ${title} ». ` +
    `Lumière naturelle douce, couleurs chaleureuses et vivantes, ambiance positive et inspirante, ` +
    `composition soignée avec profondeur de champ, rendu photographique réaliste 35mm. ` +
    `Aucun texte, aucun logo, aucun filigrane.`;
}

async function genImage(prompt, { size = '1536x1024', quality = 'medium' } = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-2', prompt, size, quality, n: 1 }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`retryable ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('no image');
      return Buffer.from(b64, 'base64');
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await sleep(Math.min(4000 * 2 ** i, 30000));
    }
  }
  throw lastErr;
}

async function saveWebp(buf, slug) {
  const base = sharp(buf, { failOn: 'none' });
  await base.clone().resize({ width: 1280, height: 853, fit: 'cover' }).webp({ quality: 76, effort: 4 }).toFile(resolve(OUT, `${slug}.webp`));
  await base.clone().resize({ width: 680, height: 453, fit: 'cover' }).webp({ quality: 72, effort: 4 }).toFile(resolve(OUT, `${slug}.thumb.webp`));
}

async function main() {
  const onlyOg = process.argv.includes('--og-only');
  await mkdir(OUT, { recursive: true });
  await mkdir(resolve(ROOT, 'public'), { recursive: true });

  // 1) Branded default OG image.
  if (!(await exists(resolve(ROOT, 'public/og-default.jpg'))) || process.argv.includes('--force-og')) {
    console.log('Generating default OG image…');
    try {
      const buf = await genImage(
        'Image lifestyle ultra réaliste et chaleureuse évoquant les envies et les projets de vie : ' +
        'voyage, cuisine, maison, découverte. Palette rose corail et pêche lumineuse, ambiance joyeuse et inspirante, ' +
        'lumière douce dorée. Composition aérée. Aucun texte, aucun logo.',
      );
      await sharp(buf).resize({ width: 1200, height: 630, fit: 'cover' }).jpeg({ quality: 82 }).toFile(resolve(ROOT, 'public/og-default.jpg'));
      console.log('  ✓ og-default.jpg');
    } catch (e) { console.warn('  ✗ OG image failed:', e.message); }
  }
  if (onlyOg) return;

  const catalogPath = resolve(ROOT, 'data/posts.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const localFor = (slug) => ({
    remote: null,
    alt: '',
    width: 1280, height: 853,
    local: `/images/posts/${slug}.webp`,
    thumb: `/images/posts/${slug}.thumb.webp`,
  });
  const save = () => writeFile(catalogPath, JSON.stringify(catalog, null, 2));

  // 2a) Reconcile: any post whose webp already exists on disk but has no catalog
  //     image (e.g. generated then interrupted) gets its image entry restored.
  let reconciled = 0;
  const missing = [];
  for (const p of catalog) {
    const hasWebp = await exists(resolve(OUT, `${p.slug}.webp`));
    if (hasWebp) {
      if (!p.image || !p.image.local) {
        p.image = { ...localFor(p.slug), alt: p.title, generated: true };
        reconciled++;
      }
    } else {
      missing.push(p);
    }
  }
  if (reconciled) { await save(); console.log(`Reconciled ${reconciled} post(s) to existing on-disk images.`); }
  if (process.argv.includes('--reconcile-only')) { console.log('reconcile-only: done.'); return; }

  // 2b) Generate the remaining missing images (incremental catalog saves).
  console.log(`${missing.length} post(s) need a generated image.`);
  let ok = 0, fail = 0;
  await pool(missing, 3, async (p) => {
    try {
      const buf = await genImage(promptFor(p.title));
      await saveWebp(buf, p.slug);
      p.image = { ...localFor(p.slug), alt: p.title, generated: true };
      ok++;
      await save();
      console.log(`  ✓ ${p.slug} (${ok}/${missing.length})`);
    } catch (e) {
      fail++;
      console.warn(`  ✗ ${p.slug}: ${e.message}`);
    }
  });

  await save();
  console.log(`\nImages generated: ${ok} ok, ${fail} failed. Catalog updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
