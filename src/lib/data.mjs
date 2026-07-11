// Build-time data access: catalog + generated article content.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT_DIR = resolve(ROOT, 'data/content');

let _catalog = null;
export function getCatalog() {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(readFileSync(resolve(ROOT, 'data/posts.json'), 'utf8'));
  return _catalog;
}

let _readySet = null;
export function readySlugs() {
  if (_readySet) return _readySet;
  _readySet = new Set();
  if (existsSync(CONTENT_DIR)) {
    for (const f of readdirSync(CONTENT_DIR)) {
      if (f.endsWith('.json')) _readySet.add(f.replace(/\.json$/, ''));
    }
  }
  return _readySet;
}

export function getContent(slug) {
  const p = resolve(CONTENT_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Deterministic pseudo-random from a string (stable across builds). */
export function hashInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Posts that already have regenerated content, newest first. */
export function getReadyPosts() {
  const ready = readySlugs();
  return getCatalog().filter((p) => ready.has(p.slug));
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** A short topical label derived from the slug's leading words (for chips). */
export function topicFromSlug(slug) {
  const w = slug.split('-').filter((x) => x.length > 2);
  return (w[0] || 'envie').replace(/^\w/, (c) => c.toUpperCase());
}
