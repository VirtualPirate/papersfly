import { jsPDF } from "jspdf";
import { registerFonts, pdfFontFacesFor } from "../fonts/registerFonts";
import { usedFontIds, type FontOverrides } from "../fonts/overrides";
import type { FontId } from "../fonts/library";
import { theme } from "../theme/theme";

/** CSS px per pt at 96dpi — the page renders at its true physical size. */
const PX = 96 / 72;

/**
 * Render the résumé into a jsPDF document directly from the rendered HTML/CSS.
 *
 * Unlike a hand-drawn writer, this walks the live DOM via `doc.html()`: jsPDF
 * emits native, selectable **vector** text for every element and embeds the
 * TTFs registered below (via `fontFaces`), so the output is true vector with the
 * real designer fonts — not a screenshot and not a Helvetica fallback. The
 * `<img>`-free résumé means nothing is rasterized.
 *
 * Browser-only by nature: `doc.html()` reads computed styles and layout from a
 * laid-out DOM, so `element` must already be rendered (the app keeps an
 * offscreen, unscaled copy of the preview for exactly this).
 */
async function renderResumeDoc(
  element: HTMLElement,
  overrides: FontOverrides,
  baseFontIds?: FontId[],
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

  // Embed only the fonts this résumé actually uses BEFORE rendering so
  // doc.html() can resolve the preview's inline font-family to them.
  const used = usedFontIds(overrides, baseFontIds);
  registerFonts(doc, used);

  const name = element.querySelector(".resume-name")?.textContent?.trim() || "Résumé";
  doc.setProperties({
    title: `${name} — Résumé`,
    author: name,
    subject: "Résumé",
    creator: "jsPDF doc.html() — Vector Resume Builder",
    keywords: "resume, cv, vector pdf",
  });

  // The web fonts must be loaded before the DOM is measured, or line breaks in
  // the PDF won't match the preview.
  await document.fonts.ready;

  // doc.html() CLONES `element` into its own container, which drops any ancestor
  // selectors — so the preview's full-page `min-height` can't be overridden from
  // a parent class. Neutralize it INLINE (which the clone keeps) so the capture
  // is exactly content-height; otherwise content lands on the 792pt page
  // boundary and autoPaging emits a trailing blank page.
  const prevMinHeight = element.style.minHeight;
  element.style.minHeight = "0px";
  try {
    await doc.html(element, {
      x: 0,
      y: 0,
      // The page renders at true size (612pt = 816px wide) and the .resume-page's
      // own padding supplies the page margins, so map 816px straight to 612pt and
      // keep doc-level margins at 0.
      width: theme.page.width,
      windowWidth: Math.round(theme.page.width * PX),
      margin: 0,
      autoPaging: "text",
      fontFaces: pdfFontFacesFor(used),
    });
  } finally {
    element.style.minHeight = prevMinHeight;
  }

  return doc;
}

/**
 * Generate the résumé PDF from the rendered HTML/CSS and trigger a direct
 * download (`doc.save` → temporary object-URL `<a download>`, no print dialog,
 * no network).
 */
export async function downloadResumePdf(
  element: HTMLElement,
  filename = "resume.pdf",
  overrides: FontOverrides = {},
  baseFontIds?: FontId[],
): Promise<void> {
  const doc = await renderResumeDoc(element, overrides, baseFontIds);
  doc.save(filename);
}
