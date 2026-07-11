// One-off generator for the full favicon set (public/favicon.*, apple-touch,
// manifest icons, .ico). Source of truth is the papersfly mark in brand/.
// Re-run with `pnpm gen:favicons` if the mark changes.
//
// Theme handling:
//  - favicon.svg is ADAPTIVE: an embedded @media (prefers-color-scheme) swaps
//    the ink so a single file adapts in every browser that supports SVG icons.
//  - favicon-96x96-{light,dark}.png back it up for PNG-only browsers that still
//    honour `media` on <link rel="icon"> (dark mark = light ink, light mark = dark ink).
//  - .ico / apple-touch / manifest icons CANNOT theme-switch, so they use an
//    opaque navy background that stays legible under either OS theme.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const OUT = "public";

// --- mark geometry (viewBox 0 0 52 52), shared by every variant ---------------
const frame = (ink) => `
  <g stroke="${ink}" stroke-width="1.6" fill="none" opacity="0.34">
    <rect x="5.5" y="9.5" width="34" height="38"/>
    <path d="M9 13 h6 M9 13 v6"/>
    <path d="M36 44 h-6 M36 44 v-6"/>
  </g>
  <g stroke="${ink}" stroke-width="1.5" stroke-linecap="round" opacity="0.26">
    <path d="M11 39 h22"/>
    <path d="M11 43 h14"/>
  </g>`;
const plane = (ink, wing) => `
  <path d="M49 3 L18 17 L31 20.5 Z" fill="${ink}"/>
  <path d="M49 3 L31 20.5 L28 32 Z" fill="${wing}"/>`;

const LIGHT = { ink: "#12233c", wing: "#23588f" }; // for light OS theme (dark ink)
const DARK = { ink: "#eaf3ff", wing: "#7ad4ea" }; // for dark OS theme (light ink)

// Flat transparent mark (used for the theme PNGs).
const flatSvg = ({ ink, wing }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" role="img" aria-label="papersfly">${frame(ink)}${plane(ink, wing)}</svg>`;

// Adaptive SVG: one file, ink swaps via CSS media query.
const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" role="img" aria-label="papersfly">
  <style>
    .ink{stroke:${LIGHT.ink};} .ink-f{fill:${LIGHT.ink};} .wing{fill:${LIGHT.wing};}
    @media (prefers-color-scheme: dark){
      .ink{stroke:${DARK.ink};} .ink-f{fill:${DARK.ink};} .wing{fill:${DARK.wing};}
    }
  </style>
  <g class="ink" stroke-width="1.6" fill="none" opacity="0.34">
    <rect x="5.5" y="9.5" width="34" height="38"/>
    <path d="M9 13 h6 M9 13 v6"/>
    <path d="M36 44 h-6 M36 44 v-6"/>
  </g>
  <g class="ink" stroke-width="1.5" stroke-linecap="round" opacity="0.26">
    <path d="M11 39 h22"/>
    <path d="M11 43 h14"/>
  </g>
  <path class="ink-f" d="M49 3 L18 17 L31 20.5 Z"/>
  <path class="wing" d="M49 3 L31 20.5 L28 32 Z"/>
</svg>`;

// Opaque navy mark with padding, for icons that can't theme-switch. Ink opacity
// bumped for legibility at small sizes. viewBox padded ~10% for maskable safe-zone.
const opaqueSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 62 62" role="img" aria-label="papersfly">
  <rect x="-5" y="-5" width="62" height="62" fill="#12233c"/>
  <g stroke="#eaf3ff" stroke-width="1.6" fill="none" opacity="0.5">
    <rect x="5.5" y="9.5" width="34" height="38"/>
    <path d="M9 13 h6 M9 13 v6"/>
    <path d="M36 44 h-6 M36 44 v-6"/>
  </g>
  <g stroke="#eaf3ff" stroke-width="1.5" stroke-linecap="round" opacity="0.4">
    <path d="M11 39 h22"/>
    <path d="M11 43 h14"/>
  </g>
  <path d="M49 3 L18 17 L31 20.5 Z" fill="#eaf3ff"/>
  <path d="M49 3 L31 20.5 L28 32 Z" fill="#7ad4ea"/>
</svg>`;

const png = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

// PNG-in-ICO: modern browsers accept PNG payloads inside the ICO container.
const buildIco = (entries) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  const data = [];
  for (const { size, buf } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    data.push(buf);
    offset += buf.length;
  }
  return Buffer.concat([header, ...dir, ...data]);
};

const write = (name, buf) => {
  writeFileSync(`${OUT}/${name}`, buf);
  console.log(`Wrote ${OUT}/${name} (${buf.length} bytes)`);
};

// --- emit ---------------------------------------------------------------------
write("favicon.svg", Buffer.from(adaptiveSvg));
write("favicon-96x96-light.png", png(flatSvg(LIGHT), 96));
write("favicon-96x96-dark.png", png(flatSvg(DARK), 96));
write("apple-touch-icon.png", png(opaqueSvg, 180));
write("web-app-manifest-192x192.png", png(opaqueSvg, 192));
write("web-app-manifest-512x512.png", png(opaqueSvg, 512));
write("favicon.ico", buildIco([16, 32, 48].map((size) => ({ size, buf: png(opaqueSvg, size) }))));

const manifest = {
  name: "papersfly",
  short_name: "papersfly",
  icons: [
    { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  theme_color: "#12233c",
  background_color: "#12233c",
  display: "standalone",
};
write("site.webmanifest", Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));
