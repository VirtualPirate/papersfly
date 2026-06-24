import type { jsPDF, HTMLFontFace } from "jspdf";
import { interRegular, interSemiBold, serifBold } from "./fontData";

/**
 * The fonts shared by the on-screen preview (@font-face in fonts.css) and the
 * exported PDF. `family`/`weight` mirror the @font-face rules so doc.html()'s
 * font matching maps the preview's CSS onto these embedded TTFs. Only the
 * weights the template actually uses are here: Inter 400 (body), Inter 600
 * (headings/labels), and Source Serif 700 (the name).
 *
 * INVARIANT: each `file` is BOTH the addFileToVFS key (below) AND the
 * pdfFontFaces `src.url`. They must stay equal — doc.html() embeds a font by
 * looking the VFS up under that name, and a miss makes jsPDF attempt a (failing,
 * offline-breaking) network fetch of the bare filename and fall back to
 * Helvetica. Both derive from this single `file` field, so keep that coupling.
 */
const FONTS = [
  { file: "Inter-Regular.ttf", data: interRegular, family: "Inter", weight: 400 },
  { file: "Inter-SemiBold.ttf", data: interSemiBold, family: "Inter", weight: 600 },
  { file: "SourceSerif-Bold.ttf", data: serifBold, family: "SourceSerif", weight: 700 },
] as const;

/**
 * Load the TTF bytes into the jsPDF virtual file system. This is the
 * load-bearing call: doc.html() re-registers each font from `pdfFontFaces`
 * (keying by `src.url`) and embeds it by looking the bytes up in the VFS, so the
 * actual TrueType program (/FontFile2) ends up in the PDF — selectable, crisp
 * vector text rather than a core-font substitute. The bytes are bundled as
 * base64 (fontData.ts), so this makes NO network request.
 */
export function registerFonts(doc: jsPDF): void {
  for (const f of FONTS) {
    doc.addFileToVFS(f.file, f.data);
    // doc.html() resolves fonts via pdfFontFaces, not this addFont — but
    // registering under the family name is harmless and lets any direct
    // doc.setFont() use the embedded face too.
    doc.addFont(f.file, f.family, "normal", f.weight);
  }
}

/**
 * Font-face descriptors handed to `doc.html()`. THIS is what actually wires the
 * preview's CSS to the embedded TTFs: without it the HTML renderer falls back to
 * Helvetica/Times; with it, `font-family: Inter`/`SourceSerif` at each weight
 * resolves to the matching VFS font (looked up by `src.url`).
 */
export const pdfFontFaces: HTMLFontFace[] = FONTS.map((f) => ({
  family: f.family,
  style: "normal",
  weight: f.weight,
  src: [{ url: f.file, format: "truetype" }],
}));
