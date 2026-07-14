/*
 * Generator for the social-share images (public/og/*.png + public/og-image.png).
 *
 * Each card is authored as HTML in the papersfly "blueprint / conformance
 * report" brand language (see brand/brand-mark.html) and rendered to a 1200×630
 * PNG by driving system Chrome via puppeteer-core — i.e. a real browser
 * screenshot, so the OG art uses the exact brand fonts and grid the site does.
 *
 * Emits:
 *   public/og-image.png            default site card
 *   public/og/alternatives.png     the /alternatives hub
 *   public/og/vs-<slug>.png        each /vs/<slug> comparison page
 *
 * Run (Node type-stripping lets it import the TS competitors module directly,
 * the single source of truth for the slug/name list):
 *   node --experimental-strip-types scripts/gen-og.mjs
 * Chrome path: $PUPPETEER_EXECUTABLE_PATH or $CHROME_PATH, else auto-detected.
 */
import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { competitors, PRICING_AS_OF } from "../src/data/competitors.ts";

const W = 1200;
const H = 630;

function chromePath() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (env) return env;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome found — set PUPPETEER_EXECUTABLE_PATH");
  return found;
}

// Pull the embedded @font-face blocks (Saira Condensed / IBM Plex Sans / Mono)
// straight out of the brand sheet so the cards render in the real brand type.
const brandHtml = readFileSync("brand/brand-mark.html", "utf8");
const fontFaces = (brandHtml.match(/@font-face\s*\{[\s\S]*?\}/g) || []).join("\n");
if (!fontFaces) throw new Error("No @font-face blocks found in brand/brand-mark.html");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The primary logomark: a document sheet with the paper plane launching from its
// top-right corner (from brand/brand-mark.html, animation removed for a stable
// screenshot).
const MARK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 52 52" aria-hidden="true" style="display:block;overflow:visible">
  <rect x="5.5" y="9.5" width="34" height="38" fill="none" class="frame-doc" stroke-width="1.6"/>
  <path d="M9 13 h6 M9 13 v6" class="frame-doc" stroke-width="1.6" fill="none"/>
  <path d="M36 44 h-6 M36 44 v-6" class="frame-doc" stroke-width="1.6" fill="none"/>
  <g class="doc-line" stroke-width="1.5" stroke-linecap="round"><path d="M11 39 h22"/><path d="M11 43 h14"/></g>
  <path d="M49 3 L18 17 L31 20.5 Z" class="plane-far"/>
  <path d="M49 3 L31 20.5 L28 32 Z" class="plane-near"/>
</svg>`;

const WORDMARK = (fontSize) =>
  `<div class="wordmark" style="font-size:${fontSize}px">papers<span class="fly">fly</span></div>`;

// Scale the big subject line down as the name gets longer so it never clips.
function subjectSize(text) {
  const n = text.length;
  if (n <= 9) return 132;
  if (n <= 13) return 112;
  if (n <= 18) return 94;
  return 78;
}

const CSS = `
${fontFaces}
:root{
  --paper:#fdfbf0; --paper-hi:#fffefb; --surface:#fffefa;
  --ink:#12233c; --muted:#5d6b7f; --faint:#8a93a2;
  --rule:rgba(18,35,60,.16); --rule-strong:#12233c;
  --accent:#23588f; --line:#23588f;
  --plane-far:#12233c; --plane-near:#23588f;
  --grid-min:rgba(48,64,90,.05); --grid-maj:rgba(48,64,90,.10);
  --f-display:"Saira Condensed","Arial Narrow",system-ui,sans-serif;
  --f-body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --f-mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular",monospace;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
.page{
  width:${W}px; height:${H}px; color:var(--ink); font-family:var(--f-body);
  -webkit-font-smoothing:antialiased; display:flex; padding:36px;
  background-color:var(--paper);
  background-image:
    linear-gradient(var(--grid-maj) 1px,transparent 1px),
    linear-gradient(90deg,var(--grid-maj) 1px,transparent 1px),
    linear-gradient(var(--grid-min) 1px,transparent 1px),
    linear-gradient(90deg,var(--grid-min) 1px,transparent 1px),
    radial-gradient(120% 90% at 50% -8%,var(--paper-hi),var(--paper) 72%);
  background-size:96px 96px,96px 96px,16px 16px,16px 16px,100% 100%;
}
.sheet{
  position:relative; flex:1; background:var(--surface);
  border:1.5px solid var(--rule-strong);
  box-shadow:0 2px 6px rgba(16,24,40,.08), 0 30px 70px -30px rgba(16,24,40,.28);
  padding:40px 52px; display:flex; flex-direction:column;
}
/* corner registration ticks — the brand's signature device */
.sheet::before,.sheet::after{content:"";position:absolute;width:16px;height:16px;border:1.5px solid var(--line);opacity:.55}
.sheet::before{left:-1px;top:-1px;border-right:0;border-bottom:0}
.sheet::after{right:-1px;bottom:-1px;border-left:0;border-top:0}
.head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  padding-bottom:18px;border-bottom:1.5px solid var(--rule-strong)}
.eyebrow{font-family:var(--f-mono);font-size:15px;font-weight:600;letter-spacing:.22em;
  text-transform:uppercase;color:var(--accent);display:inline-flex;align-items:center;gap:11px}
.eyebrow .d{width:9px;height:9px;border-radius:50%;background:var(--accent)}
.spec{font-family:var(--f-mono);font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.hero{flex:1;display:flex;flex-direction:column;justify-content:center}
.lockup{display:inline-flex;align-items:center;gap:24px}
.wordmark{font-family:var(--f-display);font-weight:700;line-height:.86;
  text-transform:uppercase;letter-spacing:.03em;color:var(--ink)}
.wordmark .fly{color:var(--accent)}
.frame-doc{stroke:var(--rule-strong);opacity:.34}
.doc-line{stroke:var(--rule-strong);opacity:.26}
.plane-far{fill:var(--plane-far)}
.plane-near{fill:var(--plane-near)}
.subject{font-family:var(--f-display);font-weight:700;text-transform:uppercase;
  letter-spacing:.02em;line-height:.9;margin-top:26px;color:var(--ink);text-wrap:balance}
.subject .accent{color:var(--accent)}
.tagline-lg{font-family:var(--f-mono);font-size:22px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);margin-top:30px}
.foot{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding-top:18px;border-top:1.5px solid var(--rule-strong);
  font-family:var(--f-mono);font-size:14px;letter-spacing:.12em;text-transform:uppercase}
.foot .l{color:var(--muted);font-weight:600}
.foot .r{color:var(--faint)}
`;

function html({ eyebrow, spec, hero, footL, footR }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="page"><div class="sheet">
  <div class="head">
    <span class="eyebrow"><span class="d"></span>${esc(eyebrow)}</span>
    <span class="spec">${esc(spec)}</span>
  </div>
  <div class="hero">${hero}</div>
  <div class="foot"><span class="l">${esc(footL)}</span><span class="r">${esc(footR)}</span></div>
</div></div></body></html>`;
}

// ---- the three card kinds -------------------------------------------------

function vsCard(c, sheetNo) {
  const subject = `vs ${c.name}`;
  const hero = `<div class="lockup">${MARK(84)}${WORDMARK(60)}</div>
    <div class="subject" style="font-size:${subjectSize(subject)}px">vs <span class="accent">${esc(c.name)}</span></div>`;
  return html({
    eyebrow: "papersfly · comparison",
    spec: `Sheet CMP-${sheetNo}`,
    hero,
    footL: "Free · no signup · true-vector PDF",
    footR: `Rev 2.0 · Verified ${PRICING_AS_OF}`,
  });
}

function hubCard() {
  const hero = `<div class="lockup">${MARK(84)}${WORDMARK(60)}</div>
    <div class="subject" style="font-size:96px">Resume builder <span class="accent">alternatives</span></div>`;
  return html({
    eyebrow: "papersfly · conformance report",
    spec: "Sheet CMP-00",
    hero,
    footL: `${competitors.length} builders · which meet spec?`,
    footR: `Rev 2.0 · Verified ${PRICING_AS_OF}`,
  });
}

function defaultCard() {
  const hero = `<div class="lockup">${MARK(128)}${WORDMARK(104)}</div>
    <div class="tagline-lg">Free vector-PDF resume builder · client-side · 100% offline</div>`;
  return html({
    eyebrow: "papersfly",
    spec: "Identity · Rev 2.0",
    hero,
    footL: "Live preview · true-vector PDF · no signup",
    footR: "Your documents stay on your device",
  });
}

// ---- render ----------------------------------------------------------------

const jobs = [
  { file: "public/og-image.png", html: defaultCard() },
  { file: "public/og/alternatives.png", html: hubCard() },
  ...competitors.map((c, i) => ({
    file: `public/og/vs-${c.slug}.png`,
    html: vsCard(c, String(i + 1).padStart(2, "0")),
  })),
];

mkdirSync("public/og", { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  for (const job of jobs) {
    await page.setContent(job.html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: job.file, type: "png", clip: { x: 0, y: 0, width: W, height: H } });
    console.log("Wrote", job.file);
  }
} finally {
  await browser.close();
}
console.log(`\nDone — ${jobs.length} OG images.`);
