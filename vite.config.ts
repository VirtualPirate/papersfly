import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Fully static SPA — no server-side anything. `vite build` emits a folder of
// static assets that runs offline once cached. jsPDF code-splits
// html2canvas/canvg/dompurify into separate dynamic-import chunks: html2canvas
// is fetched from its local dist chunk on download (it is jsPDF's DOM-rendering
// backend), while canvg/dompurify are emitted but never fetched on this
// element-input, image-free path. Generation works offline because those chunks
// and the base64 fonts are all local static assets.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    // The embedded base64 fonts make one chunk large by design; raise the
    // warning limit so the build stays quiet about an intentional choice.
    chunkSizeWarningLimit: 1600,
  },
});
