import type { ResumeData } from "../data/resume";
import type { Template } from "../templates/types";
import { buildPdf } from "./buildPdf";

/**
 * Generate the PDF in-browser and trigger a DIRECT file download.
 *
 * `doc.save()` serializes the document to a Blob and clicks a temporary
 * object-URL `<a download>` — no `window.print()`, no print dialog, and no
 * network request. Everything (fonts included) is already in memory.
 */
export function downloadResumePdf(
  template: Template,
  data: ResumeData,
  filename = "resume.pdf",
): void {
  const doc = buildPdf(template, data);
  doc.save(filename);
}
