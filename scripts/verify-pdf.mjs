/*
 * Headless verification that the generated PDF is TRUE VECTOR.
 *
 * It bundles the app's real `buildPdf` (via esbuild, the same transpiler Vite
 * uses) and runs it in Node — no browser — then inspects the bytes:
 *   1. /Producer names jsPDF                          (metadata)
 *   2. /FontFile2 present                             (embedded TTF program)
 *   3. NO /Subtype /Image                             (not a screenshot)
 *   4. pdf.js extracts the real text                  (selectable / searchable)
 *
 * Run with: npm run verify:pdf
 */
import { build } from "esbuild";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Entry that imports the real PDF builder + classic writer + sample data, and
// returns the PDF bytes. Note: imports `classicToPdf` directly (not the React
// template module) so no DOM/CSS is pulled into Node.
const entry = `
import { buildPdf } from ${JSON.stringify(join(root, "src/pdf/buildPdf.ts"))};
import { classicToPdf } from ${JSON.stringify(join(root, "src/templates/classic/classicPdf.ts"))};
import { sampleResume } from ${JSON.stringify(join(root, "src/data/resume.ts"))};
const template = { id: "classic", name: "Classic", toPdf: classicToPdf, Preview: () => null };
export function make() {
  const doc = buildPdf(template, sampleResume);
  return new Uint8Array(doc.output("arraybuffer"));
}
`;

const result = await build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  loader: { ".css": "empty", ".ttf": "binary" },
});

const tmpFile = join(tmpdir(), `verify-pdf-${process.pid}.mjs`);
writeFileSync(tmpFile, result.outputFiles[0].text);

let bytes;
try {
  const mod = await import(pathToFileURL(tmpFile).href);
  bytes = mod.make();
} finally {
  rmSync(tmpFile, { force: true });
}

const outPath = join(root, "resume.pdf");
writeFileSync(outPath, bytes);

// ---- Inspect the raw bytes ----
const raw = Buffer.from(bytes).toString("latin1");
const producer = raw.match(/\/Producer\s*\(([^)]*)\)/)?.[1] ?? "(none)";
const creator = raw.match(/\/Creator\s*\(([^)]*)\)/)?.[1] ?? "(none)";
const hasFontFile2 = raw.includes("/FontFile2");
const fontSubtype = [...raw.matchAll(/\/Subtype\s*\/(TrueType|Type0|CIDFontType2)/g)].map(
  (m) => m[1],
);
const hasImage = /\/Subtype\s*\/Image/.test(raw);
const kb = (bytes.length / 1024).toFixed(1);

// ---- Extract text with pdf.js (proves it is selectable, not raster) ----
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({
  data: new Uint8Array(bytes),
  useSystemFonts: false,
  isEvalSupported: false,
}).promise;

let text = "";
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  text += content.items.map((i) => i.str).join(" ") + "\n";
}
text = text.replace(/\s+/g, " ").trim();

const expectations = [
  "Jordan Avery Chen",
  "Senior Software Engineer",
  "Northwind Labs",
  "event-sourced",
  "Berkeley",
  "TypeScript",
];
const found = expectations.filter((e) => text.includes(e));

// ---- Report ----
const ok = (b) => (b ? "PASS" : "FAIL");
console.log("================ VECTOR PDF VERIFICATION ================");
console.log(`File:                resume.pdf  (${kb} KB, ${doc.numPages} page[s])`);
console.log(`/Producer:           ${producer}`);
console.log(`/Creator:            ${creator}`);
console.log(`[${ok(/jspdf/i.test(producer + creator))}] Metadata names jsPDF`);
console.log(`[${ok(hasFontFile2)}] Embedded TTF program (/FontFile2 present)`);
console.log(`     font subtypes seen: ${[...new Set(fontSubtype)].join(", ") || "none"}`);
console.log(`[${ok(!hasImage)}] No raster image XObject (/Subtype /Image absent)`);
console.log(`[${ok(found.length === expectations.length)}] Selectable text extracted via pdf.js`);
console.log(`     matched ${found.length}/${expectations.length}: ${found.join(", ")}`);
console.log("");
console.log("First 220 chars of extracted text:");
console.log("  " + text.slice(0, 220));
console.log("========================================================");

const allPass =
  /jspdf/i.test(producer + creator) &&
  hasFontFile2 &&
  !hasImage &&
  found.length === expectations.length;
process.exit(allPass ? 0 : 1);
