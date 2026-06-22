import type { jsPDF } from "jspdf";
import { interRegular, interSemiBold, interBold, serifBold } from "./fontData";

/**
 * Register the embedded TTFs onto a jsPDF document.
 *
 * The font bytes are bundled into the JS as base64 (see `fontData.ts`), so this
 * makes NO network request — the whole point of the offline guarantee. jsPDF
 * embeds the actual TTF program into the PDF, which is what makes the text true
 * vector: real glyph outlines, selectable and crisp at any zoom.
 *
 * After this runs, use:
 *   doc.setFont("Inter", "normal" | "semibold" | "bold")
 *   doc.setFont("SourceSerif", "semibold" | "bold")
 */
export function registerFonts(doc: jsPDF): void {
  const files: Array<[file: string, b64: string, family: string, style: string]> = [
    ["Inter-Regular.ttf", interRegular, "Inter", "normal"],
    ["Inter-SemiBold.ttf", interSemiBold, "Inter", "semibold"],
    ["Inter-Bold.ttf", interBold, "Inter", "bold"],
    ["SourceSerif-Bold.ttf", serifBold, "SourceSerif", "bold"],
  ];

  for (const [file, b64, family, style] of files) {
    doc.addFileToVFS(file, b64);
    doc.addFont(file, family, style);
  }
}
