// Minimal allow-list HTML sanitizer for AI-generated fragments (build-time).
// Keeps only safe inline/text tags; strips scripts, styles, event handlers.
const ALLOWED = new Set(['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br', 'span']);

export function sanitizeHtml(html = '') {
  if (!html) return '';
  let out = String(html);
  // Remove script/style blocks entirely.
  out = out.replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Drop any tag not in the allow-list (keep inner text).
  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrs) => {
    const name = tag.toLowerCase();
    if (!ALLOWED.has(name)) return '';
    if (match.startsWith('</')) return `</${name}>`;
    if (name === 'a') {
      const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
      let href = hrefMatch ? hrefMatch[2] || hrefMatch[3] || '' : '';
      // Block dangerous protocols.
      if (/^\s*(javascript|data|vbscript):/i.test(href)) href = '';
      // Hosts treated as first-party / editorial: kept as natural in-context links
      // (dofollow, same tab). Everything else external gets nofollow + _blank.
      const trusted = ['jaimerais.fr', 'julien-jimenez-email-marketing.com'];
      const external = /^https?:\/\//i.test(href) && !trusted.some((h) => href.includes(h));
      const rel = external ? ' rel="noopener nofollow" target="_blank"' : '';
      return href ? `<a href="${href.replace(/"/g, '&quot;')}"${rel}>` : '<a>';
    }
    return `<${name}>`;
  });
  return out;
}
