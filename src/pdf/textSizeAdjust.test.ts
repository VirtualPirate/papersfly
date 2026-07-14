import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pinTextSizeAdjust } from "./download";

/**
 * Guard against mobile text auto-inflation corrupting the exported PDF.
 *
 * The resume/invoice sheet renders in a fixed 816px-wide block (612pt) at true
 * physical size, regardless of the device viewport. On real iOS Safari
 * (`-webkit-text-size-adjust: auto` default) and Android Chrome ("font
 * boosting" / Text Autosizing), a block far wider than the layout viewport has
 * its COMPUTED font-size inflated to keep wide text legible. `doc.html()` draws
 * the vector PDF from those computed styles, so the inflation flows straight
 * into the PDF — text comes out too big on phones while desktop is correct
 * (measured on iPhone: 9pt body text baked in at ~12.75pt, spilling a one-page
 * resume onto a second page).
 *
 * The pin (`text-size-adjust: 100%`) lands in TWO places, and both matter:
 *
 *  1. The index.css `.resume-page` / html+body rules protect the on-screen
 *     preview (which renders in the main document, where the stylesheet applies).
 *
 *  2. `doc.html()` deep-clones the capture node into html2canvas's OWN
 *     measurement document, and an external-stylesheet class rule is not
 *     guaranteed to apply in that clone — which is why the class-only pin left
 *     the exported PDF inflated on iPhone. So download.ts also pins it INLINE on
 *     the capture root (`pinTextSizeAdjust`); inline styles are copied
 *     node-for-node by the clone and inherit to every descendant, reaching the
 *     measurement context the class rule cannot.
 *
 * The autosizing behaviour is platform-gated and cannot be reproduced in
 * headless Chrome / jsdom, so these guards (static CSS + inline-pin mechanics)
 * are the regression backstop.
 */
const GLOBAL_CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "index.css");

describe("text auto-inflation guard: index.css (preview)", () => {
  const css = readFileSync(GLOBAL_CSS, "utf8");

  it("pins text-size-adjust: 100% on the resume sheet capture root", () => {
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

describe("text auto-inflation guard: inline pin on the capture root (PDF)", () => {
  // jsdom (cssstyle) drops the unprefixed `text-size-adjust` but keeps the
  // -webkit- form, so assertions target the webkit property that is observable
  // here; the helper sets both for real browsers.
  it("sets -webkit-text-size-adjust: 100% inline on the element", () => {
    const el = document.createElement("div");
    pinTextSizeAdjust(el);
    expect(el.style.getPropertyValue("-webkit-text-size-adjust")).toBe("100%");
  });

  it("restores the previous inline value (none) when the returned fn runs", () => {
    const el = document.createElement("div");
    const restore = pinTextSizeAdjust(el);
    restore();
    expect(el.style.getPropertyValue("-webkit-text-size-adjust")).toBe("");
    expect(el.getAttribute("style") ?? "").not.toMatch(/text-size-adjust/);
  });

  it("restores a pre-existing inline value rather than clearing it", () => {
    const el = document.createElement("div");
    el.style.setProperty("-webkit-text-size-adjust", "80%");
    const restore = pinTextSizeAdjust(el);
    expect(el.style.getPropertyValue("-webkit-text-size-adjust")).toBe("100%");
    restore();
    expect(el.style.getPropertyValue("-webkit-text-size-adjust")).toBe("80%");
  });
});
