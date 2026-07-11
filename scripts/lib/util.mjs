// Shared helpers for the data + content pipeline.
import { setTimeout as sleep } from 'node:timers/promises';

export const WP_BASE = 'https://jaimerais.fr/wp-json/wp/v2';

/** Strip HTML tags + decode a few common entities to plain text. */
export function toPlain(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;|&apos;/g, '’')
    .replace(/&laquo;|&raquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à')
    .replace(/&ecirc;/g, 'ê').replace(/&ccedil;/g, 'ç').replace(/&#8217;/g, '’')
    .replace(/&#8230;/g, '…').replace(/&#8211;|&#8212;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

/** fetch with retries + exponential backoff. Returns parsed JSON. */
export async function fetchJSON(url, opts = {}, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      const wait = Math.min(2000 * 2 ** i, 20000);
      if (i < tries - 1) await sleep(wait);
    }
  }
  throw lastErr;
}

/** fetch raw buffer with retries. */
export async function fetchBuffer(url, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await sleep(Math.min(2000 * 2 ** i, 20000));
    }
  }
  throw lastErr;
}

/** Run an async mapper over items with a fixed concurrency pool. */
export async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await worker(items[cur], cur);
    }
  });
  await Promise.all(runners);
  return results;
}

export { sleep };
