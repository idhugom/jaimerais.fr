// @ts-check
import { defineConfig } from 'astro/config';

// Static output -> dist/ ; deployed on Cloudflare Pages (npm run build).
export default defineConfig({
  site: 'https://jaimerais.fr',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
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
