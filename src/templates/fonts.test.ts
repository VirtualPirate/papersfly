import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { FONT_LIBRARY } from "../fonts/library";

/**
 * Every template's CSS must stay inside the font set the PDF pipeline can embed
 * — because the same DOM is both the preview and the PDF source, anything else
 * renders differently (or wrong) in the exported PDF:
 *
 *   - weights: only those shipped in the library (fonts/library.ts) are embedded.
 *     An unshipped weight snaps to the nearest embedded one (jsPDF resolveFontWeight).
 *   - style: no italic/oblique face is embedded → faux-italic on screen but
 *     UPRIGHT in the PDF.
 *   - family: only the two variant slots (--f-serif / --f-sans) map onto embedded
 *     fonts. A literal or system stack (e.g. ui-monospace) is never embedded and
 *     falls back to a jsPDF standard font — Courier for a monospace stack.
 *
 * This test is derived from the library so it self-updates: ship an 800 TTF and
 * 800 becomes allowed automatically. It scans raw CSS, so it cannot see inline
 * TSX styles or `font:` shorthand — the headless PDF forensic check
 * (scripts/inspect-pdf.mjs, run in CI) is the backstop for what actually renders.
 */
const TEMPLATES_DIR = dirname(fileURLToPath(import.meta.url));

/** Every *.css under src/templates (resume + invoice designs). */
function templateCssFiles(): string[] {
  return readdirSync(TEMPLATES_DIR, { recursive: true })
    .map(String)
    .filter((p) => p.endsWith(".css"))
    .map((p) => join(TEMPLATES_DIR, p));
}

const SHIPPED_WEIGHTS = new Set(
  FONT_LIBRARY.flatMap((f) => f.weights.map((w) => String(w.weight))),
);
const ALLOWED_FAMILIES = new Set(["var(--f-serif)", "var(--f-sans)"]);

const files = templateCssFiles();

describe("template CSS only uses fonts the PDF pipeline can embed", () => {
  it("discovers template CSS to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const name = relative(TEMPLATES_DIR, file);
    const css = readFileSync(file, "utf8");

    it(`${name}: every font-weight is a shipped weight (${[...SHIPPED_WEIGHTS].sort().join("/")})`, () => {
      const bad = [...css.matchAll(/font-weight:\s*(\d+)/g)]
        .map((m) => m[1])
        .filter((w) => !SHIPPED_WEIGHTS.has(w));
      expect(bad, `unshipped font-weight(s) in ${name}`).toEqual([]);
    });

    it(`${name}: declares no italic/oblique (no italic face is embedded)`, () => {
      expect(css, `non-embeddable font-style in ${name}`).not.toMatch(
        /font-style:\s*(italic|oblique)/,
      );
    });

    it(`${name}: every font-family routes to a variant slot (no literal/system stack)`, () => {
      const bad = [...css.matchAll(/font-family:\s*([^;]+);/g)]
        .map((m) => m[1].trim())
        .filter((f) => !ALLOWED_FAMILIES.has(f));
      expect(bad, `non-slot font-family in ${name}`).toEqual([]);
    });
  }
});
