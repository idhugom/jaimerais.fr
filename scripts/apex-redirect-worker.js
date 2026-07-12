// Cloudflare Worker: 301-redirect the apex (jaimerais.fr) to the canonical
// www.jaimerais.fr, preserving path + query string. Bound to the route
// "jaimerais.fr/*" (apex only) — www is served directly by Pages.
addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  url.protocol = 'https:';
  url.hostname = 'www.jaimerais.fr';
  event.respondWith(Response.redirect(url.toString(), 301));
});
