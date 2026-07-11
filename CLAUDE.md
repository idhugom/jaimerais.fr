# CLAUDE.md — jaimerais.fr

Static **Astro** site (white-mode, "love/kiff" design) that replaces the old WordPress at
jaimerais.fr. Deployed on **Cloudflare Pages** (build `npm run build`, output `dist`, branch `main`).

## Key facts
- **1086 posts** imported from the old WP REST API. Slugs are preserved 1:1 (URLs must not change).
- Content is **fully rewritten by AI** (OpenAI `gpt-5.6-terra`, Responses API + Batch API) and stored
  as structured JSON in `data/content/<slug>.json`. Rendered by `src/components/ArticleBlocks.astro`.
- Catalog metadata (title, excerpt, image paths, dates) lives in `data/posts.json` (committed).
  `data/raw-posts.json` (original WP content, reference for the rewrite) is gitignored.
- Featured images are self-hosted WebP under `public/images/posts/<slug>.webp` (+ `.thumb.webp`).
  Missing ones are generated with `gpt-image-2` (see `scripts/gen-images.mjs`).

## Article states
- If `data/content/<slug>.json` exists → full rich article.
- If not → graceful "en cours" placeholder, page is `noindex`, and it's excluded from the sitemap.
  Batches fill these in over time; rebuild + redeploy to publish.

## Resuming the batch (async, up to 24h)
```bash
node scripts/ingest-batch.mjs   # ingests any completed batches -> data/content/*.json
npm run build                   # rebuild
# redeploy (see below)
```
Batch tracking is in `data/batch/batches.json`.

## Deploy
- GitHub-connected Pages build on push to `main` (preferred), OR direct upload:
  `npx wrangler pages deploy dist --project-name jaimerais-preprod`.
- Go-live (custom domain + www→apex redirect): `node scripts/go-live.mjs` once DNS is in Cloudflare.

## Don't
- Don't change slugs. Don't commit `node_modules/`, `dist/`, `data/raw-posts.json`, `data/batch/*.jsonl`.
- Keep it white-mode only (no dark theme) per the brief.
