import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Fully static SPA — no server-side anything. `vite build` emits a folder of
// static assets that runs offline once cached.
const emptyStub = fileURLToPath(new URL("./src/stub-empty.ts", import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      // jsPDF only pulls these in via its unused doc.html() raster path.
      html2canvas: emptyStub,
      dompurify: emptyStub,
      canvg: emptyStub,
    },
  },
  build: {
    // The embedded base64 fonts make one chunk large by design; raise the warning
    // limit so the build stays quiet about an intentional choice.
    chunkSizeWarningLimit: 1200,
  },
});
