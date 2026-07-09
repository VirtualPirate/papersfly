import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * The font pipeline embeds a fixed set only: each variant's display/body family
 * (via the --f-serif / --f-sans slots), weights 400/600/700, and the "normal"
 * style — see fonts/library.ts + registerFonts.ts. Anything a template asks for
 * outside that set does NOT render as authored: unshipped weights snap to the
 * nearest embedded weight, italic has no face (faux-italic on screen, UPRIGHT in
 * the PDF), and a literal/system font-family is never embedded (it falls back to
 * a jsPDF standard font — e.g. Courier for a monospace stack). So the invoice
 * CSS must stay inside the set, exactly as the résumé templates do.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = {
  nordic: "nordic/nordic.css",
  sterling: "sterling/sterling.css",
  prism: "prism/prism.css",
  bureau: "bureau/bureau.css",
} as const;

const ALLOWED_WEIGHTS = new Set(["400", "600", "700"]);
const ALLOWED_FAMILIES = new Set(["var(--f-serif)", "var(--f-sans)"]);

describe("invoice templates only use fonts the PDF pipeline can embed", () => {
  for (const [name, rel] of Object.entries(CSS)) {
    const css = readFileSync(join(HERE, rel), "utf8");

    it(`${name}: every font-weight is a shipped weight (400/600/700)`, () => {
      const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]);
      const bad = weights.filter((w) => !ALLOWED_WEIGHTS.has(w));
      expect(bad, `unshipped weight(s) in ${name}.css`).toEqual([]);
    });

    it(`${name}: declares no italic/oblique (no italic face is embedded)`, () => {
      expect(css, `${name}.css uses a non-embeddable font-style`).not.toMatch(
        /font-style:\s*(italic|oblique)/,
      );
    });

    it(`${name}: every font-family routes to a variant slot (no literal/system stack)`, () => {
      const families = [...css.matchAll(/font-family:\s*([^;]+);/g)].map((m) =>
        m[1].trim(),
      );
      const bad = families.filter((f) => !ALLOWED_FAMILIES.has(f));
      expect(bad, `non-slot font-family in ${name}.css`).toEqual([]);
    });
  }
});
