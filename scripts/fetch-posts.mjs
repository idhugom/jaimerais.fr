// Fetch ALL posts from the live WordPress site and build the site catalog.
// - Preserves slug 100% identically.
// - Captures the existing featured image URL (to be downloaded/optimized later).
// - Keeps the original content only as a REFERENCE for the AI rewrite (gitignored).
//
// Output:
//   data/posts.json      -> committed catalog (metadata + local image path)
//   data/raw-posts.json  -> gitignored, original HTML content for the rewrite prompt
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WP_BASE, fetchJSON, toPlain, pool } from './lib/util.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PER_PAGE = 100;

async function getTotalPages() {
  const res = await fetch(`${WP_BASE}/posts?per_page=1&_fields=id`);
  return Number(res.headers.get('x-wp-totalpages') || '0');
}

async function fetchAllPosts() {
  const totalPages = await getTotalPages();
  console.log(`WordPress reports ${totalPages} page(s) at per_page=1.`);
  const pages = Math.ceil((totalPages || 1) / PER_PAGE) + 1; // generous upper bound
  const all = [];
  for (let page = 1; page <= pages; page++) {
    const url = `${WP_BASE}/posts?per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc` +
      `&_fields=id,slug,date,modified,title,excerpt,content,featured_media,yoast_head_json`;
    let batch;
    try {
      batch = await fetchJSON(url);
    } catch (err) {
      // Past the last page WP returns 400 -> stop.
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    console.log(`  page ${page}: +${batch.length} (total ${all.length})`);
    if (batch.length < PER_PAGE) break;
  }
  return all;
}

async function fetchMediaMap(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map();
  const chunks = [];
  for (let i = 0; i < unique.length; i += PER_PAGE) chunks.push(unique.slice(i, i + PER_PAGE));
  await pool(chunks, 6, async (chunk) => {
    const url = `${WP_BASE}/media?include=${chunk.join(',')}&per_page=${PER_PAGE}` +
      `&_fields=id,source_url,alt_text,media_details`;
    const items = await fetchJSON(url);
    for (const m of items) {
      const md = m.media_details || {};
      const sizes = md.sizes || {};
      // Prefer a large-but-reasonable source; fall back to full.
      const best = sizes.large?.source_url || sizes.full?.source_url || m.source_url;
      map.set(m.id, {
        url: best,
        full: sizes.full?.source_url || m.source_url,
        alt: (m.alt_text || '').trim(),
        width: md.width || null,
        height: md.height || null,
      });
    }
  });
  return map;
}

function bestImageFromYoast(yoast) {
  const og = yoast?.og_image;
  if (Array.isArray(og) && og[0]?.url) {
    return { url: og[0].url, width: og[0].width || null, height: og[0].height || null };
  }
  return null;
}

async function main() {
  console.log('Fetching all posts…');
  const posts = await fetchAllPosts();
  console.log(`Fetched ${posts.length} posts.`);

  const mediaMap = await fetchMediaMap(posts.map((p) => p.featured_media));
  console.log(`Resolved ${mediaMap.size} featured media items.`);

  const catalog = [];
  const raw = [];
  for (const p of posts) {
    const media = mediaMap.get(p.featured_media);
    const yoastImg = bestImageFromYoast(p.yoast_head_json);
    const imgUrl = media?.url || yoastImg?.url || null;
    const title = toPlain(p.title?.rendered || '');
    const excerpt = toPlain(p.excerpt?.rendered || '').replace(/\s*\[…\]$/, '…');
    const metaDesc = (p.yoast_head_json?.description || '').trim();

    catalog.push({
      id: p.id,
      slug: p.slug,
      title,
      excerpt,
      metaDescription: metaDesc,
      date: p.date,
      modified: p.modified,
      image: imgUrl
        ? {
            remote: imgUrl,
            alt: media?.alt || title,
            width: media?.width || yoastImg?.width || null,
            height: media?.height || yoastImg?.height || null,
            local: `/images/posts/${p.slug}.webp`,
            thumb: `/images/posts/${p.slug}.thumb.webp`,
          }
        : null,
    });

    raw.push({
      id: p.id,
      slug: p.slug,
      title,
      metaDescription: metaDesc,
      originalHtml: p.content?.rendered || '',
      originalText: toPlain(p.content?.rendered || ''),
    });
  }

  // Newest first (already ordered, but be explicit).
  catalog.sort((a, b) => new Date(b.date) - new Date(a.date));

  await mkdir(resolve(ROOT, 'data'), { recursive: true });
  await writeFile(resolve(ROOT, 'data/posts.json'), JSON.stringify(catalog, null, 2));
  await writeFile(resolve(ROOT, 'data/raw-posts.json'), JSON.stringify(raw));
  const withImg = catalog.filter((c) => c.image).length;
  console.log(`\nWrote data/posts.json (${catalog.length} posts, ${withImg} with image).`);
  console.log('Wrote data/raw-posts.json (reference content, gitignored).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
