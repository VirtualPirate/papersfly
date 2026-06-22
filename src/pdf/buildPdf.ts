import { jsPDF } from "jspdf";
import type { ResumeData } from "../data/resume";
import type { Template } from "../templates/types";
import { registerFonts } from "../fonts/registerFonts";

/**
 * Build the vector PDF document for a template + data.
 *
 * Pure and isomorphic — no DOM, no network, no `window`. It runs identically in
 * the browser and in Node (the verification script imports this exact function),
 * which is what lets us prove the output is true vector outside a browser too.
 */
export function buildPdf(template: Template, data: ResumeData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

  // Embed the TTF fonts (from bundled base64) — the source of true-vector text.
  registerFonts(doc);

  // Document metadata. jsPDF stamps `/Producer (jsPDF <version>)` automatically;
  // we name it in /Creator too so the tool is unambiguous in the file metadata.
  doc.setProperties({
    title: `${data.name} — Résumé`,
    author: data.name,
    subject: "Résumé",
    creator: "jsPDF — Vector Resume Builder",
    keywords: "resume, cv, vector pdf",
  });

  template.toPdf(doc, data);
  return doc;
}
