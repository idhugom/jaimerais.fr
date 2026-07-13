# CLAUDE.md — jaimerais.fr

Static **Astro** site (white-mode, "love/kiff" design) that replaces the old WordPress at
jaimerais.fr. Deployed on **Cloudflare Pages** (build `npm run build`, output `dist`, branch `main`).

> Ce fichier fait autorité pour toute intervention de Claude sur le projet. Les **règles
> d'intervention** et les **règles de rédaction** ci‑dessous priment sur les habitudes par défaut.

## Key facts
- **1086 posts** imported from the old WP REST API. Slugs are preserved 1:1 (URLs must not change).
- The **initial corpus** was rewritten by the OpenAI Batch pipeline (`gpt-5.6-terra`, Responses +
  Batch API — see the legacy pipeline below). **Going forward, new articles are written by Claude
  directly in-session** (voir « Règles de rédaction »). Only images still go through OpenAI.
- Article content is stored as structured JSON in `data/content/<slug>.json` and rendered by
  `src/components/ArticleBlocks.astro` (block types: `prose`, `key_points`, `callout`, `table`,
  `comparison`, `steps`, `stats`, `quote`).
- Catalog metadata (title, excerpt, image paths, dates) lives in `data/posts.json` (committed).
  `data/raw-posts.json` (original WP content, reference for the rewrite) is gitignored.
- Featured images are self-hosted WebP under `public/images/posts/<slug>.webp` (+ `.thumb.webp`).
  Missing ones are generated with `gpt-image-2` (see `scripts/gen-images.mjs`).
- Article URL = `/conseils/<slug>` ; listing = `/conseils`. Allowed inline HTML in generated
  content (sanitizer allow‑list) : `p, strong, em, b, i, ul, ol, li, a, br, span`.

---

## Règles d'intervention Claude (prioritaires)

### 1. Toujours travailler sur `main` (très important)
Toute session — développement, rédaction, amélioration, correction, etc. — se fait **directement sur
la branche `main`**. Ne **JAMAIS** créer de branche ni travailler sur une branche secondaire. Commit
puis push sur `main` (le push déclenche le build/déploiement Cloudflare Pages).

### 2. Toujours en qualité maximale
Se placer systématiquement en **qualité/intelligence maximale du modèle** (le réglage le plus
performant) pour chaque intervention — rédaction comme code. **Seule exception :** la génération de la
photo OpenAI reste en `quality: "medium"` (voir §6).

### 3. Clés API / tokens — depuis l'environnement uniquement
Les clés et tokens nécessaires (`OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, …) sont fournis par l'environnement cloud de Claude
Code via **`process.env`**. Récupère‑les depuis l'environnement ; ne les **redemande jamais**, ne les
**écris jamais en dur** dans le code, et ne les **commit jamais**.

---

## Règles de rédaction (c'est Claude qui rédige)

### 0. Règles d'or (prioritaires)
1. **Rédaction par Claude, pas par l'API.** Le contenu de l'article est écrit par **Claude**
   (qualité maximale), directement en session — plus par le pipeline OpenAI. Seules les **images**
   passent par OpenAI.
2. **Anti‑cannibalisation.** Si le sujet est libre, **vérifier d'abord l'existant** : chaque nouvel
   article doit porter sur un sujet/angle **différent** de ce qui est déjà publié (voir §3).
3. **Qualité avant tout.** Chaque article doit apporter les **meilleures informations** sur son
   sujet : plus de détails, et — selon la pertinence — des éléments riches (tableau, comparatif,
   étapes, astuces, FAQ, citation, chiffres…). Ce sont des **exemples** : inutile de tout mettre à
   chaque fois (voir §4).
4. **Photo OpenAI obligatoire.** Ne **jamais** publier un article sans visuel : toujours une vraie
   photo de couverture générée par OpenAI, « ultra réaliste », **avant** publication (voir §6).
5. **Liens internes.** Ajouter **1 à 3 liens internes** (4 au maximum) par article vers d'autres
   pages du site (voir §5).

### 1. Le site en bref
**jaimerais.fr — « le magazine des envies ».** Site statique Astro (white‑mode, design « love/kiff »)
qui reprend un ancien WordPress : **1086 articles**, **slugs identiques** (les URLs ne doivent pas
changer). Contenu **en français** : des guides du quotidien, pratiques **et** inspirants — voyage,
cuisine, maison, bricolage, argent/assurance, loisirs, bien‑être… Chaque article vit sous
`/conseils/<slug>` et répond à une **vraie intention de recherche** (souvent une question :
« comment… », « quel/quelle… », « pourquoi… »).

### 2. Identité & ton
- **Promesse de marque :** transformer les « **j'aimerais…** » en projets concrets. On passe du rêve
  à l'action.
- **Valeurs** (cf. `/a-propos`) : **utile avant tout**, **bienveillant**, **inspirant**,
  **complet & clair**.
- **Ton :** chaleureux et direct, comme un ami de confiance ; **vouvoiement** ; positif et
  encourageant, jamais donneur de leçons ni « blabla ». Le `hero_intro` peut s'ouvrir sur un
  « J'aimerais… » à la première personne, puis le corps s'adresse au lecteur en « vous ».
- **Français soigné**, accessible, sans jargon inutile. Formats FR (€, dates en toutes lettres,
  espaces insécables). Ni promesses trompeuses ni superlatifs creux : on informe honnêtement.

### 3. Avant d'écrire — anti‑cannibalisation
Avec ~1086 articles, le risque de doublon est réel. **Avant de rédiger** (sujet libre) :
1. Chercher dans le catalogue les sujets proches — par ex. `grep -i "mot-clé" data/posts.json`
   (titres/slugs/excerpts) et parcourir `data/content/`.
2. **Une seule intention/mot‑clé principal par article.** Si un article très proche existe déjà :
   soit choisir un **angle distinct / longue traîne**, soit **enrichir l'article existant** plutôt
   que d'en créer un quasi‑doublon (ne jamais changer un slug existant).
3. Choisir un **slug unique** en kebab‑case, français, mot‑clé en tête (ex.
   `comment-choisir-son-assurance-habitation`).

### 4. Qualité rédactionnelle
- **Vraie valeur ajoutée :** viser le meilleur contenu du web sur la question (détails concrets,
  chiffres vérifiables, étapes actionnables), pas un résumé générique.
- **Structure** via le système de blocs (`data/content/<slug>.json`, voir schéma plus bas) :
  - `hero_intro` (accroche, 2–4 phrases), `key_takeaways` (**L'essentiel**, 3–6 puces), `toc`
    (sommaire, > 2 entrées) ;
  - corps en `prose` avec des **h2** clairs, enrichi **selon la pertinence** par : `table`,
    `comparison` (2 colonnes), `steps`, `stats`, `callout` (`tip` 💡 / `info` ℹ️ / `warning` ⚠️ /
    `love` 💗), `quote` ;
  - `faq` (questions réelles → alimente le schéma **FAQPage**), `conclusion_html` (« En résumé »).
- **Ne pas tout mettre systématiquement** : choisir les blocs qui servent réellement le sujet.
- **Longueur :** un article complet, pas un billet creux (souvent ~1200–2000+ mots ;
  `reading_time_min` cohérent, ~6–10 min).
- **`meta_description`** vendeuse, ~150–160 caractères. HTML limité à la liste autorisée
  (`p, strong, em, b, i, ul, ol, li, a, br, span`) — pas de `h1/h3/div/img/script` dans les
  fragments HTML.

### 5. Liens internes (1 à 3 par article, 4 maximum)
- Ajouter **1 à 3 liens internes** contextuels (4 max) vers d'**autres articles existants** du site,
  dans le fil du texte (`prose`, `steps`, `callout`, `faq`, `conclusion_html`).
- Utiliser des **URLs relatives** : `<a href="/conseils/<slug>">ancre naturelle</a>`. Le sanitizer
  les traite comme **dofollow / même onglet** (les liens externes reçoivent
  `rel="noopener nofollow" target="_blank"`).
- Vérifier que la cible **existe** (présente dans `data/posts.json` et idéalement dans
  `data/content/`), et choisir une **ancre descriptive** (pas « cliquez ici »). Ces liens sont
  éditoriaux et **en plus** du bloc « À lire aussi » généré automatiquement.

### 6. Photo — toujours une vraie photo OpenAI avant publication
- **Règle absolue :** jamais d'article sans visuel. Une **seule** photo (hero) par article, **ultra
  réaliste**, générée par OpenAI. Pas de galerie ni d'image dans le corps.
- **Modèle & paramètres** (clé via `OPENAI_API_KEY`) :
  `{ "model": "gpt-image-2", "size": "1536x1024", "quality": "medium" }`.
- Prompt type : **photo éditoriale généraliste sur le thème, ultra réaliste**, lumière naturelle
  douce, ambiance positive — **aucun texte, logo ni filigrane** (cf. `scripts/gen-images.mjs`,
  `npm run images:gen`).
- Sortie attendue : `public/images/posts/<slug>.webp` (1280×853) **et** `<slug>.thumb.webp`
  (680×453), avec l'objet `image` du catalogue pointant sur ces fichiers locaux.

### Checklist — publier un nouvel article
1. **Anti‑cannibalisation** (§3) : vérifier l'existant, fixer l'angle et le **slug** unique.
2. **Catalogue** `data/posts.json` : ajouter une entrée `{ id, slug, title, excerpt,
   metaDescription, date, modified, image }` (`id` numérique **unique**, supérieur au plus grand id
   existant ; `date`/`modified` au format ISO local, ex. `2026-07-13T09:00:00`).
3. **Contenu** `data/content/<slug>.json` : rédiger l'article (Claude, qualité max) selon le schéma
   ci‑dessous, avec **1 à 3 liens internes** (§5).
4. **Photo** (§6) : générer le hero `gpt-image-2` (`quality: medium`) →
   `public/images/posts/<slug>.webp` + `.thumb.webp`, et pointer l'`image` du catalogue dessus
   (`{ local, thumb, alt, width:1280, height:853, generated:true, remote:null }`).
5. **Build** : `npm run build` (vérifier l'absence d'erreur ; l'article passe alors en indexable et
   entre au sitemap).
6. **Commit + push sur `main`** → déploiement Cloudflare Pages.

### Schéma `data/content/<slug>.json`
```jsonc
{
  "title": "…",                 // titre H1 de l'article
  "meta_description": "…",       // ~150–160 caractères
  "reading_time_min": 8,         // entier
  "hero_intro": "…",            // accroche (peut commencer par « J'aimerais… »)
  "key_takeaways": ["…"],       // « L'essentiel à retenir » (3–6 puces)
  "toc": ["…"],                 // sommaire (affiché si > 2 entrées)
  "sections": [                  // blocs, dans l'ordre voulu :
    { "type": "prose",      "heading": "…", "html": "<p>…</p>" },
    { "type": "key_points", "heading": "…", "points": ["…"] },
    { "type": "callout",    "variant": "tip|info|warning|love", "title": "…", "html": "<p>…</p>" },
    { "type": "table",      "heading": "…", "intro": "…", "columns": ["…"], "rows": [["…"]], "note": "…" },
    { "type": "comparison", "heading": "…", "intro": "…",
      "left":  { "title": "…", "points": ["…"] },
      "right": { "title": "…", "points": ["…"] } },
    { "type": "steps",      "heading": "…", "intro": "…",
      "steps": [ { "title": "…", "html": "<p>…</p>" } ] },
    { "type": "stats",      "heading": "…", "items": [ { "value": "…", "label": "…" } ] },
    { "type": "quote",      "text": "…", "author": "…" }
  ],
  "faq": [ { "q": "…", "a_html": "<p>…</p>" } ],  // alimente le schéma FAQPage
  "conclusion_html": "<p>…</p>"                    // affiché sous « En résumé »
}
```

---

## Article states
- If `data/content/<slug>.json` exists → full rich article.
- If not → graceful "en cours" placeholder, page is `noindex`, and it's excluded from the sitemap.
  Batches fill these in over time; rebuild + redeploy to publish.

## Legacy batch pipeline (import initial des 1086 articles)
Utilisé pour la **réécriture de masse initiale** ; les **nouveaux** articles sont désormais écrits par
Claude (voir « Règles de rédaction »). Pour reprendre un batch en cours (async, jusqu'à 24 h) :
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
- Don't publish an article without a hero image (§6). Don't hard-code API keys/tokens (§3).
- Don't create branches — work on `main` (§1).
