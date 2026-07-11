# Mise en production — domaine & redirection www

La préprod tourne sur **https://jaimerais-preprod.pages.dev** (projet Cloudflare Pages
`jaimerais-preprod`, connecté à GitHub `idhugom/jaimerais.fr`, branche `main`).

Quand la préprod est validée, pour passer sur le vrai domaine `jaimerais.fr` :

## 1. Pointer le domaine vers Cloudflare
- Ajouter le site `jaimerais.fr` comme **zone** dans le compte Cloudflare (si ce n'est pas déjà fait),
  puis mettre à jour les **nameservers** du registrar vers ceux fournis par Cloudflare.

## 2. Attacher le domaine au projet Pages + redirection www → sans www
Une fois la zone `jaimerais.fr` présente dans Cloudflare, exécuter :

```bash
node scripts/go-live.mjs
```

Ce script :
1. attache `jaimerais.fr` **et** `www.jaimerais.fr` au projet Pages `jaimerais-preprod` ;
2. crée une **règle de redirection 301** `www.jaimerais.fr/*` → `https://jaimerais.fr/$1`
   (phase `http_request_dynamic_redirect` de la zone), en conservant le chemin et la query string.

Le CNAME/enregistrement du domaine apex est géré automatiquement par Cloudflare Pages lors de
l'attachement du domaine personnalisé (dans la même zone).

## 3. Compatibilité des anciennes URLs (SEO)
Les articles sont servis en **URL propre** `https://jaimerais.fr/conseils/<slug>` (le slug est
préservé à l'identique). Les anciennes URLs WordPress `…/conseils/<slug>.html` sont
**redirigées automatiquement (308)** par Cloudflare Pages vers l'URL propre — aucune action requise.
Le `sitemap.xml` et les balises canoniques pointent déjà vers les URLs propres.

## Vérifs post-bascule
```bash
curl -I https://jaimerais.fr/                                   # 200
curl -I https://www.jaimerais.fr/                               # 301 -> https://jaimerais.fr/
curl -I https://jaimerais.fr/conseils/<un-slug>                 # 200
curl -I https://jaimerais.fr/conseils/<un-slug>.html            # 308 -> /conseils/<un-slug>
```
