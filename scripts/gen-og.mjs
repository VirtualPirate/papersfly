// One-off generator for the social-share image (public/og-image.png).
// Unbranded placeholder: solid accent background + app name/tagline rendered in
// the project's own Inter fonts. Re-run with `pnpm gen:og` after copy changes.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#1f3a5f" />
  <text x="80" y="300" font-family="Inter" font-weight="600" font-size="76" fill="#ffffff">Vector Resume Builder</text>
  <text x="80" y="372" font-family="Inter" font-weight="400" font-size="34" fill="#c7d2e4">Live preview · true-vector PDF · 100% offline</text>
</svg>`;

const resvg = new Resvg(svg, {
  font: {
    fontFiles: ["src/fonts/inter-semibold.ttf", "src/fonts/inter-regular.ttf"],
    loadSystemFonts: false,
    defaultFontFamily: "Inter",
  },
  fitTo: { mode: "width", value: W },
});

writeFileSync("public/og-image.png", resvg.render().asPng());
console.log("Wrote public/og-image.png");
