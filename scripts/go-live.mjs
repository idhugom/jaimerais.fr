// Go-live helper: attach the custom domain(s) to the Pages project and set up
// the www -> non-www 301 redirect. Run this ONCE the DNS points to Cloudflare
// (i.e. the zone jaimerais.fr exists in this Cloudflare account).
//
//   node scripts/go-live.mjs
//
// Idempotent-ish: skips domains already attached; replaces the redirect rule.
// Primary domain is WWW: the apex (jaimerais.fr) redirects (301) to www.jaimerais.fr.
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PROJECT = process.env.CF_PAGES_PROJECT || 'jaimerais-preprod';
const APEX = 'jaimerais.fr';
const WWW = 'www.jaimerais.fr';
const CF = 'https://api.cloudflare.com/client/v4';

const h = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const j = (r) => r.json();

async function addDomain(domain) {
  const res = await fetch(`${CF}/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, {
    method: 'POST', headers: h, body: JSON.stringify({ name: domain }),
  });
  const data = await j(res);
  console.log(`domain ${domain}:`, data.success ? 'attached' : JSON.stringify(data.errors));
}

async function findZone() {
  const res = await fetch(`${CF}/zones?name=${APEX}`, { headers: h });
  const data = await j(res);
  return data.result?.[0]?.id || null;
}

async function setWwwRedirect(zoneId) {
  const body = {
    rules: [{
      expression: `(http.host eq "${APEX}")`,
      description: 'apex -> www (301)',
      action: 'redirect',
      action_parameters: {
        from_value: {
          status_code: 301,
          target_url: { expression: `concat("https://${WWW}", http.request.uri.path)` },
          preserve_query_string: true,
        },
      },
    }],
  };
  const res = await fetch(
    `${CF}/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
    { method: 'PUT', headers: h, body: JSON.stringify(body) },
  );
  const data = await j(res);
  console.log('www redirect rule:', data.success ? 'set' : JSON.stringify(data.errors));
}

async function main() {
  await addDomain(APEX);
  await addDomain(WWW);
  const zoneId = await findZone();
  if (!zoneId) {
    console.log(`\nZone ${APEX} not found in this Cloudflare account yet.`);
    console.log('Point the DNS to Cloudflare (add the site as a zone), then re-run for the www redirect.');
    return;
  }
  console.log(`Zone found: ${zoneId}`);
  await setWwwRedirect(zoneId);
  console.log('\nDone. jaimerais.fr now redirects to https://www.jaimerais.fr (301).');
}

main().catch((e) => { console.error(e); process.exit(1); });
