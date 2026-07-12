// Go-live helper. Idempotent-ish. Requires the zone jaimerais.fr to exist in
// this Cloudflare account. Steps:
//   1. attach jaimerais.fr + www.jaimerais.fr to the Pages project
//   2. create proxied CNAME DNS records for both -> <project>.pages.dev
//   3. deploy an apex->www 301 redirect Worker + route (www is the canonical host)
//
//   node scripts/go-live.mjs
//
// Note: the redirect is done with a Worker (not a Redirect Rule) so it works with
// an API token scoped to Pages + DNS + Workers but NOT Rulesets.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PROJECT = process.env.CF_PAGES_PROJECT || 'jaimerais-preprod';
const APEX = 'jaimerais.fr';
const WWW = 'www.jaimerais.fr';
const WORKER = 'apex-to-www-jaimerais';
const CF = 'https://api.cloudflare.com/client/v4';

const jh = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const j = (r) => r.json();

async function addDomain(domain) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, {
    method: 'POST', headers: jh, body: JSON.stringify({ name: domain }),
  });
  const d = await j(res);
  console.log(`attach ${domain}:`, d.success ? 'ok' : JSON.stringify(d.errors));
}

async function findZone() {
  const d = await j(await fetch(`${CF}/zones?name=${APEX}`, { headers: jh }));
  return d.result?.[0]?.id || null;
}

async function ensureDns(zoneId, name) {
  const d = await j(await fetch(`${CF}/zones/${zoneId}/dns_records`, {
    method: 'POST', headers: jh,
    body: JSON.stringify({ type: 'CNAME', name, content: `${PROJECT}.pages.dev`, proxied: true, ttl: 1 }),
  }));
  console.log(`dns ${name}:`, d.success ? 'ok' : JSON.stringify(d.errors));
}

async function deployWorker() {
  const code = await readFile(resolve(ROOT, 'scripts/apex-redirect-worker.js'), 'utf8');
  const d = await j(await fetch(`${CF}/accounts/${ACCOUNT}/workers/scripts/${WORKER}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/javascript' },
    body: code,
  }));
  console.log('worker deploy:', d.success ? 'ok' : JSON.stringify(d.errors));
}

async function ensureRoute(zoneId) {
  const d = await j(await fetch(`${CF}/zones/${zoneId}/workers/routes`, {
    method: 'POST', headers: jh,
    body: JSON.stringify({ pattern: `${APEX}/*`, script: WORKER }),
  }));
  console.log('apex route:', d.success ? 'ok' : JSON.stringify(d.errors));
}

async function main() {
  await addDomain(APEX);
  await addDomain(WWW);
  const zoneId = await findZone();
  if (!zoneId) {
    console.log(`\nZone ${APEX} introuvable dans ce compte Cloudflare. Ajoute le domaine puis relance.`);
    return;
  }
  console.log(`zone: ${zoneId}`);
  await ensureDns(zoneId, APEX);
  await ensureDns(zoneId, WWW);
  await deployWorker();
  await ensureRoute(zoneId);
  console.log(`\nOK. ${WWW} = domaine principal ; ${APEX} redirige (301) vers https://${WWW}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
