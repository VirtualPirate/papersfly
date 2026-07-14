/*
 * Forensic vector-vs-raster classifier for any PDF: reports the producer,
 * embedded-font subtypes, text-vs-image operator counts, any non-embedded
 * (standard-14) fonts actually used to draw text, the extracted text, and a
 * VECTOR/RASTER verdict.
 *
 * Usage: node scripts/inspect-pdf.mjs <path-to.pdf> [--strict]
 *
 * --strict exits non-zero unless the PDF is a clean vector document: 0 images,
 * a VECTOR verdict, and NO fallback font (Courier/Helvetica/Times…) drawing
 * text. This is the CI gate for the browser-only PDF export — it catches a
 * template asking for a font the pipeline can't embed (which jsPDF silently
 * renders in a standard font), the exact class of bug the static CSS test
 * (src/templates/fonts.test.ts) cannot see because it only reads source.
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const numFlag = (name) => {
  const a = args.find((x) => x.startsWith(`${name}=`));
  return a ? Number(a.split("=")[1]) : undefined;
};
// Optional strict thresholds (see verify-pdfs.mjs):
//   --min-weights=N  distinct embedded fonts drawing text must be >= N (a
//                    weight-matching collapse renders every role in one font).
//   --max-pages=N    page count must be <= N (catches layout overflow, e.g. a
//                    size regression pushing a one-page resume onto a second).
const MIN_WEIGHTS = numFlag("--min-weights");
const MAX_PAGES = numFlag("--max-pages");
const FILE = args.find((a) => !a.startsWith("--"));
if (!FILE) {
  console.error("Usage: node scripts/inspect-pdf.mjs <path-to.pdf> [--strict]");
  process.exit(1);
}
const bytes = new Uint8Array(readFileSync(FILE));
const raw = Buffer.from(bytes).toString("latin1");
const kb = (bytes.length / 1024).toFixed(1);

// ---- Raw byte signals ----
const producer = raw.match(/\/Producer\s*\(([^)]*)\)/)?.[1] ?? "(none)";
const creator = raw.match(/\/Creator\s*\(([^)]*)\)/)?.[1] ?? "(none)";
const hasFontFile2 = raw.includes("/FontFile2");
const hasFontFile = /\/FontFile(?![23])/.test(raw);
const hasFontFile3 = raw.includes("/FontFile3");
const fontSubtypes = [
  ...raw.matchAll(/\/Subtype\s*\/(TrueType|Type0|CIDFontType2|Type1)/g),
].map((m) => m[1]);

// Every image XObject, with dimensions + filter.
const images = [];
for (const m of raw.matchAll(/\/Subtype\s*\/Image/g)) {
  const win = raw.slice(Math.max(0, m.index - 300), m.index + 300);
  const w = win.match(/\/Width\s+(\d+)/)?.[1];
  const h = win.match(/\/Height\s+(\d+)/)?.[1];
  const filter = win.match(/\/Filter\s*\/(\w+)/)?.[1];
  images.push({ w, h, filter });
}

// ---- pdf.js: text + operator composition ----
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({
  data: new Uint8Array(bytes),
  useSystemFonts: false,
  isEvalSupported: false,
}).promise;

// Build a reverse map of OPS code -> name.
const opName = {};
for (const [name, code] of Object.entries(pdfjs.OPS)) opName[code] = name;

let allText = "";
let totalTextItems = 0;
const opTally = {};
// Fonts actually used to draw selectable text, and whether their font file is
// present. jsPDF's standard-14 fallbacks (Courier/Helvetica/Times) come back
// with `missingFile: true` — i.e. text drawn in a non-embedded font.
const fallbackFonts = new Map(); // BaseFont name -> sample strings
// Distinct embedded fonts that actually draw text — a proxy for weights in use.
// A weight-matching collapse (every role resolving to one font) drops this to 1.
const fontsDrawing = new Set();
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  // getOperatorList first: it resolves fonts into page.commonObjs so the
  // getTextContent fontNames below can be looked up.
  const ops = await page.getOperatorList();
  for (const fn of ops.fnArray) {
    const n = opName[fn] ?? String(fn);
    opTally[n] = (opTally[n] || 0) + 1;
  }
  const content = await page.getTextContent();
  totalTextItems += content.items.length;
  allText += content.items.map((i) => i.str).join(" ") + "\n";
  for (const it of content.items) {
    if (!it.str.trim()) continue;
    let font;
    try { font = page.commonObjs.get(it.fontName); } catch { font = null; }
    if (font && !font.missingFile) fontsDrawing.add(it.fontName);
    if (font && font.missingFile) {
      const arr = fallbackFonts.get(font.name) || [];
      if (arr.length < 5) arr.push(it.str.trim());
      fallbackFonts.set(font.name, arr);
    }
  }
}
const text = allText.replace(/\s+/g, " ").trim();

const imageOps = Object.entries(opTally)
  .filter(([n]) => /paint.*Image|Image.*XObject/i.test(n))
  .reduce((a, [, c]) => a + c, 0);
const textOps = (opTally.showText || 0) + (opTally.showSpacedText || 0);

console.log("================ PDF FORENSICS ================");
console.log(`File:        ...${FILE.slice(-45)}`);
console.log(`Size:        ${kb} KB   Pages: ${doc.numPages}`);
console.log(`/Producer:   ${producer}`);
console.log(`/Creator:    ${creator}`);
console.log("");
console.log(`Embedded fonts:  FontFile2(TTF)=${hasFontFile2}  FontFile3(CFF)=${hasFontFile3}  FontFile(T1)=${hasFontFile}`);
console.log(`Font subtypes:   ${[...new Set(fontSubtypes)].join(", ") || "NONE"}`);
console.log("");
console.log(`Image XObjects:  ${images.length}`);
for (const im of images) console.log(`   - ${im.w}x${im.h}  filter=${im.filter}`);
console.log("");
console.log(`Text run ops (showText):     ${textOps}`);
console.log(`Image paint ops:             ${imageOps}`);
console.log(`Selectable text items:       ${totalTextItems}`);
console.log(`Extracted text length:       ${text.length} chars`);
console.log("");
console.log(`Distinct fonts drawing text: ${fontsDrawing.size}`);
console.log(`Fallback fonts drawing text: ${fallbackFonts.size === 0 ? "none ✓" : ""}`);
for (const [name, samples] of fallbackFonts) {
  console.log(`   ✗ ${name} (NOT embedded) e.g. ${JSON.stringify(samples)}`);
}
console.log("");
console.log("First 300 chars of extracted text:");
console.log("  " + JSON.stringify(text.slice(0, 300)));
console.log("");

const verdict =
  totalTextItems > 20 && textOps > 20
    ? "VECTOR — real selectable glyph text"
    : images.length >= 1 && totalTextItems < 5
      ? "RASTER — page is an embedded image (screenshot), no real text"
      : "MIXED / INCONCLUSIVE — see numbers above";
console.log(`VERDICT: ${verdict}`);
console.log("===============================================");

if (STRICT) {
  const problems = [];
  if (!verdict.startsWith("VECTOR")) problems.push(`verdict is not VECTOR (${verdict})`);
  if (images.length > 0) problems.push(`${images.length} image XObject(s) — export must be image-free`);
  if (fallbackFonts.size > 0)
    problems.push(`text drawn in non-embedded font(s): ${[...fallbackFonts.keys()].join(", ")}`);
  if (MIN_WEIGHTS !== undefined && fontsDrawing.size < MIN_WEIGHTS)
    problems.push(`only ${fontsDrawing.size} distinct font(s) draw text, expected >= ${MIN_WEIGHTS} (weight collapse?)`);
  if (MAX_PAGES !== undefined && doc.numPages > MAX_PAGES)
    problems.push(`${doc.numPages} pages, expected <= ${MAX_PAGES} (layout overflow?)`);
  if (problems.length) {
    console.error("\n✗ STRICT FAIL:");
    for (const p of problems) console.error(`   - ${p}`);
    process.exit(1);
  }
  console.log("\n✓ STRICT PASS — clean vector PDF, all text in embedded fonts");
}
