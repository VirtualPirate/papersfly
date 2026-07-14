import type { jsPDF, HTMLFontFace } from "jspdf";
import { FONT_LOADERS } from "./fontData";
import { getFont, type FontId } from "./library";

/**
 * Load the TTF bytes for each used family into the jsPDF virtual file system and
 * register every weight. Driven entirely by the font library + per-family base64
 * modules, so the VFS key, the addFont path, and the @font-face src.url all
 * derive from one `file` field and cannot drift. Only the families in `usedIds`
 * are embedded — AND, because each family's base64 lives in its own dynamically
 * imported chunk (fontData/<id>.ts), only those families are even downloaded, so
 * a resume using two fonts never fetches the whole library. No network beyond
 * the bundled chunk itself: the bytes are base64 baked into the build.
 *
 * Async because the family chunks load on demand — callers must await this
 * before `doc.html()` so every used glyph is registered when the DOM is measured.
 */
export async function registerFonts(doc: jsPDF, usedIds: FontId[]): Promise<void> {
  const datas = await Promise.all(usedIds.map((id) => FONT_LOADERS[id]?.()));
  usedIds.forEach((id, i) => {
    const font = getFont(id);
    const data = datas[i];
    if (!font || !data) return;
    for (const w of font.weights) {
      const b64 = data[w.file];
      if (!b64) continue;
      doc.addFileToVFS(w.file, b64);
      doc.addFont(w.file, font.cssFamily, "normal", w.weight);
    }
  });
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
