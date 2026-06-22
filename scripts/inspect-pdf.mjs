/*
 * Forensic vector-vs-raster check for an arbitrary PDF.
 * Reuses the same signals as verify-pdf.mjs but on an external file.
 */
import { readFileSync } from "node:fs";

const FILE = "/Users/artazasameen/Downloads/PartyBalanceSummaryReport (1).pdf";
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
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  totalTextItems += content.items.length;
  allText += content.items.map((i) => i.str).join(" ") + "\n";
  const ops = await page.getOperatorList();
  for (const fn of ops.fnArray) {
    const n = opName[fn] ?? String(fn);
    opTally[n] = (opTally[n] || 0) + 1;
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
