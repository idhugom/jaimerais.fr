# jaimerais.fr — le magazine des envies

Refonte complète du site (ex-WordPress) en site statique **Astro**, design « love / kiff »
vibrant (white mode), déployé sur **Cloudflare Pages**.

- **1086 articles** repris depuis l'ancien WordPress : **slug 100 % identique**, image à la une
  récupérée (ou régénérée si absente), **contenu entièrement réécrit** par IA (gpt-5.6-terra,
  Responses API + Batch API) — contenu à forte valeur ajoutée avec encadrés, tableaux, FAQ,
  comparatifs 2 colonnes.
- Design original : hero « J'aimerais… » à mots rotatifs, curseur personnalisé, cartes en tilt,
  animations flottantes, révélation au scroll, marquee, etc. Accessible et responsive.

## Stack

- [Astro](https://astro.build) (sortie statique → `dist/`)
- Polices auto-hébergées (Fraunces, Plus Jakarta Sans, Caveat) via Fontsource
- Images optimisées en WebP (sharp)

## Commandes

```bash
npm install
npm run dev        # dev local
npm run build      # build statique -> dist/
npm run preview    # sert dist/
```

## Pipeline de contenu

```bash
# 1. Récupérer les articles + images depuis l'ancien WordPress
npm run data:fetch      # -> data/posts.json (+ data/raw-posts.json, gitignored)
npm run data:images     # télécharge + optimise les images à la une -> public/images/posts/

# 2. Générer le contenu
npm run content:sync -- --limit 40         # génération synchrone (tranche)
npm run content:batch:build -- --chunk 250 # prépare les fichiers JSONL du Batch API
npm run content:batch:submit               # soumet les batchs à OpenAI
npm run content:batch:ingest               # récupère les résultats -> data/content/<slug>.json

# 3. Images manquantes + OG (gpt-image-2)
npm run images:gen
```

Le contenu réécrit est stocké dans `data/content/<slug>.json` (structuré) et rendu par
`src/components/ArticleBlocks.astro`. Un article sans contenu régénéré affiche un état
« en cours » (noindex) jusqu'à l'arrivée du résultat du batch.

## Déploiement (Cloudflare Pages)

- Branche de production : `main`
- Build : `npm run build`
- Répertoire de sortie : `dist`
- Répertoire racine : (vide)
- Commentaires de build : activés

### Passage en production (DNS)

1. Ajouter le domaine `jaimerais.fr` (apex) et `www.jaimerais.fr` au projet Pages.
2. Pointer les DNS (CNAME `jaimerais-preprod.pages.dev`, ou enregistrements fournis par Cloudflare).
3. Règle de redirection **www → sans www** (301). Voir `scripts/cf-redirect-rule.md`.

## Variables d'environnement

- `OPENAI_API_KEY` — génération de contenu et d'images
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — déploiement
