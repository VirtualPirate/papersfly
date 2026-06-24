import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// SINGLE SOURCE OF TRUTH for the production origin. Canonical/OG URLs, the
// sitemap, and robots.txt all derive from this. Replace with the real domain
// once chosen (must start with http:// or https://). For a subpath deploy
// (e.g. GitHub Pages project site) also set `base: "/repo-name/"`.
const SITE = "https://example.com";

// Fully static output (Astro default). The résumé tool is a browser-only React
// island (`client:only`); Astro only renders the SEO <head> + skeleton shell.
export default defineConfig({
  site: SITE,
  // Keep the Astro dev toolbar OFF: it injects extra DOM/<style> into the dev
  // page that html2canvas (jsPDF's doc.html() backend) clones, which corrupts
  // the résumé header layout in the PDF exported from `astro dev`. Re-enabling it
  // brings back the bug where the name/headline/contact render as side-by-side
  // columns instead of stacked. Production is unaffected (no toolbar there).
  devToolbar: { enabled: false },
  integrations: [react(), sitemap()],
  build: {
    // Inline small stylesheets into <head> to avoid a render-blocking request.
    inlineStylesheets: "auto",
  },
  vite: {
    build: {
      // The base64 embedded-font module is intentionally large on the PDF path.
      chunkSizeWarningLimit: 1600,
    },
    // Pre-bundle jsPDF + its dynamic html2canvas backend so the first Download
    // click in `astro dev` doesn't trigger a dep re-optimization + full reload.
    optimizeDeps: {
      include: ["jspdf", "jspdf > html2canvas"],
    },
  },
});
