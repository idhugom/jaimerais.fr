# Production — domaine & redirection (état actuel)

Le site est en production sur le projet Cloudflare Pages `jaimerais-preprod`
(connecté à GitHub `idhugom/jaimerais.fr`, branche `main`).

- **Domaine principal (canonique) : `www.jaimerais.fr`** — servi par Cloudflare Pages.
- **`jaimerais.fr` (apex) → 301 → `https://www.jaimerais.fr`** (chemin + query conservés),
  via un **Worker Cloudflare** (`scripts/apex-redirect-worker.js`) sur la route `jaimerais.fr/*`.
- Anciennes URLs WordPress `…/conseils/<slug>.html` → **308 → URL propre** `…/conseils/<slug>`
  (comportement natif de Pages). Slugs 100 % préservés.

## Reproduire / re-déployer la config
```bash
node scripts/go-live.mjs
```
Le script (idempotent) : attache les 2 domaines au projet Pages, crée les enregistrements
DNS proxifiés (CNAME → `jaimerais-preprod.pages.dev`), déploie le Worker de redirection et
sa route sur l'apex.

> Le token API fourni est scoppé **Pages + DNS + Workers** (pas *Rulesets*), c'est pourquoi la
> redirection apex→www passe par un **Worker** plutôt que par une *Redirect Rule*. Une Redirect
> Rule équivalente reste possible depuis le dashboard (Rules → Redirect Rules) si tu préfères.

## Vérifs
```bash
curl -I https://www.jaimerais.fr/                          # 200
curl -I https://jaimerais.fr/                              # 301 -> https://www.jaimerais.fr/
curl -I https://www.jaimerais.fr/conseils/<slug>           # 200
curl -I https://www.jaimerais.fr/conseils/<slug>.html      # 308 -> /conseils/<slug>
```
