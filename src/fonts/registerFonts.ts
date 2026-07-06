import type { jsPDF, HTMLFontFace } from "jspdf";
import { FONT_DATA } from "./fontData";
import { getFont, type FontId } from "./library";

/**
 * Load the TTF bytes for each used family into the jsPDF virtual file system and
 * register every weight. Driven entirely by the font library + FONT_DATA, so the
 * VFS key, the addFont path, and the @font-face src.url all derive from one
 * `file` field and cannot drift. Only the families in `usedIds` are embedded, so
 * a résumé using two fonts does not carry the whole library. No network: the
 * bytes are bundled base64 (fontData.ts).
 */
export function registerFonts(doc: jsPDF, usedIds: FontId[]): void {
  for (const id of usedIds) {
    const font = getFont(id);
    if (!font) continue;
    for (const w of font.weights) {
      const data = FONT_DATA[w.file];
      if (!data) continue;
      doc.addFileToVFS(w.file, data);
      doc.addFont(w.file, font.cssFamily, "normal", w.weight);
    }
  }
}

/**
 * Font-face descriptors handed to `doc.html()` — what actually wires the
 * preview's CSS font-family onto the embedded TTFs. One entry per used family
 * weight; `src.url` equals the VFS key registered above.
 */
export function pdfFontFacesFor(usedIds: FontId[]): HTMLFontFace[] {
  const faces: HTMLFontFace[] = [];
  for (const id of usedIds) {
    const font = getFont(id);
    if (!font) continue;
    for (const w of font.weights) {
      faces.push({
        family: font.cssFamily,
        style: "normal",
        weight: w.weight,
        src: [{ url: w.file, format: "truetype" }],
      });
    }
  }
  return faces;
}
