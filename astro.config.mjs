// @ts-check
import { defineConfig } from 'astro/config';

// Static output -> dist/ ; deployed on Cloudflare Pages (npm run build).
export default defineConfig({
  site: 'https://www.jaimerais.fr',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // 'file' -> /conseils/<slug>.html, matching the legacy WordPress URLs 1:1
    // so existing SEO / backlinks survive the migration.
    format: 'file',
    inlineStylesheets: 'auto',
  },
  image: {
    // Featured images are pre-optimized to webp in scripts/ ; keep Astro's
    // service available for any in-page <Image/> usage.
    responsiveStyles: true,
  },
  compressHTML: true,
  devToolbar: { enabled: false },
});
