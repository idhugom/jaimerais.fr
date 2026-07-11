// Self-contained visual check: serves dist/ in-process + drives Chromium.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const OUT = '/tmp/claude-0/-home-user-jaimerais-fr/54f5f9be-86a6-509c-8bd8-e14609f8ddc3/scratchpad';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml',
};

async function tryFiles(pathname) {
  const candidates = [];
  const clean = pathname.replace(/\/+$/, '');
  candidates.push(join(DIST, pathname));
  candidates.push(join(DIST, clean + '.html'));
  candidates.push(join(DIST, clean, 'index.html'));
  if (pathname === '/' || pathname === '') candidates.push(join(DIST, 'index.html'));
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isFile()) return c;
    } catch {}
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = (await tryFiles(decodeURIComponent(url.pathname))) || join(DIST, '404.html');
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}`;
console.log('serving on', base);

// Viewport captures at specific scroll offsets (avoids fullPage stitching artifacts).
const art = '/location-voiture-retour-domicile/';
const shots = [
  { url: '/', name: 'v-home-top', w: 1440, h: 900, y: 0 },
  { url: '/', name: 'v-home-featured', w: 1440, h: 900, y: 780 },
  { url: '/', name: 'v-home-wall', w: 1440, h: 900, y: 1900 },
  { url: '/', name: 'v-home-mobile-top', w: 390, h: 844, y: 0 },
  { url: '/conseils/', name: 'v-conseils-top', w: 1440, h: 900, y: 0 },
  { url: art, name: 'v-art-top', w: 1440, h: 900, y: 0 },
  { url: art, name: 'v-art-mid', w: 1440, h: 900, y: 1500 },
  { url: art, name: 'v-art-mid2', w: 1440, h: 900, y: 2600 },
  { url: art, name: 'v-art-faq', w: 1440, h: 900, y: 4200 },
];

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base + s.url, { waitUntil: 'load', timeout: 30000 });
  // Reveal-trigger by scrolling progressively up to target, then settle.
  await page.evaluate(async (targetY) => {
    const step = window.innerHeight * 0.5;
    for (let y = 0; y <= targetY + window.innerHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, targetY);
    await new Promise((r) => setTimeout(r, 500));
  }, s.y);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: false });
  console.log('shot', s.name);
  await page.close();
}
await browser.close();
server.close();
console.log('done');
