import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Guard against mobile text auto-inflation corrupting the exported PDF.
 *
 * The résumé/invoice sheet renders in a fixed 816px-wide block (612pt) at true
 * physical size, regardless of the device viewport. On real iOS Safari
 * (`-webkit-text-size-adjust: auto` default) and Android Chrome ("font
 * boosting" / Text Autosizing), a block far wider than the layout viewport has
 * its COMPUTED font-size inflated to keep wide text legible. `doc.html()` draws
 * the vector PDF from those computed styles, so the inflation flows straight
 * into the PDF — text comes out too big on phones while desktop is correct.
 *
 * The fix is to pin `text-size-adjust: 100%` so browsers honour the authored
 * `pt` sizes. It must land on the capture root (`.resume-page`, carried by every
 * template) so it survives into the offscreen copy `doc.html()` captures. This
 * behaviour is platform-gated and cannot be reproduced in headless Chrome /
 * jsdom, so this static guard is the regression backstop.
 */
const GLOBAL_CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "index.css");

describe("text auto-inflation guard (mobile PDF fidelity)", () => {
  const css = readFileSync(GLOBAL_CSS, "utf8");

  it("pins text-size-adjust: 100% on the résumé sheet capture root", () => {
    // Match a `.resume-page { ... text-size-adjust: 100% ... }` block, tolerating
    // the -webkit- prefix Safari requires.
    const block = /\.resume-page\s*\{[^}]*\}/gs;
    const resumePageRules = css.match(block)?.join("\n") ?? "";
    expect(resumePageRules).toMatch(/(-webkit-)?text-size-adjust:\s*100%/);
  });

  it("also pins it document-wide (html/body) so the preview is protected", () => {
    expect(css).toMatch(/(-webkit-)?text-size-adjust:\s*100%/);
    // The webkit-prefixed form must be present for iOS Safari specifically.
    expect(css).toMatch(/-webkit-text-size-adjust:\s*100%/);
  });
});
