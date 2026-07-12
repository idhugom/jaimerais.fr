import { getCatalog, readySlugs, postUrl } from '../lib/data.mjs';

export function GET() {
  const site = 'https://www.jaimerais.fr';
  const ready = readySlugs();
  const posts = getCatalog().filter((p) => ready.has(p.slug));
  const staticPages = ['/', '/conseils', '/a-propos'];

  const urls = [
    ...staticPages.map((u) => ({ loc: site + u, priority: u === '/' ? '1.0' : '0.7' })),
    ...posts.map((p) => ({
      loc: `${site}${postUrl(p.slug)}`,
      lastmod: (p.modified || p.date || '').slice(0, 10),
      priority: '0.8',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
