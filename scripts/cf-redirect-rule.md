# Mise en production — domaine & redirection

Le site tourne sur le projet Cloudflare Pages `jaimerais-preprod`
(connecté à GitHub `idhugom/jaimerais.fr`, branche `main`).

**Domaine principal (canonique) : `www.jaimerais.fr`.**
L'apex `jaimerais.fr` **redirige (301)** vers `https://www.jaimerais.fr`.

## Configuration (une fois la zone `jaimerais.fr` présente dans Cloudflare)

```bash
node scripts/go-live.mjs
```

Ce script :
1. attache `jaimerais.fr` **et** `www.jaimerais.fr` au projet Pages ;
2. crée une **règle de redirection 301** `jaimerais.fr/*` → `https://www.jaimerais.fr/$1`
   (phase `http_request_dynamic_redirect` de la zone), chemin + query string conservés.

Les enregistrements DNS des deux domaines sont créés automatiquement par Cloudflare Pages
lors de l'attachement (même compte/zone).

## Compatibilité des anciennes URLs (SEO)
Les articles sont servis en **URL propre** `https://www.jaimerais.fr/conseils/<slug>` (slug
préservé). Les anciennes URLs WordPress `…/conseils/<slug>.html` sont redirigées
**automatiquement (308)** par Cloudflare Pages vers l'URL propre. `sitemap.xml`, balises
canoniques et JSON-LD pointent déjà vers `www.jaimerais.fr`.

## Vérifs post-bascule
```bash
curl -I https://www.jaimerais.fr/                          # 200
curl -I https://jaimerais.fr/                              # 301 -> https://www.jaimerais.fr/
curl -I https://www.jaimerais.fr/conseils/<un-slug>        # 200
curl -I https://www.jaimerais.fr/conseils/<un-slug>.html   # 308 -> /conseils/<un-slug>
```
