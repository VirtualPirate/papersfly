import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/resume/classic";
import { meridianTemplate } from "../../templates/resume/meridian";
import { quillTemplate } from "../../templates/resume/quill";
import { ledgerTemplate } from "../../templates/resume/ledger";
import { atlasTemplate } from "../../templates/resume/atlas";
import { resumeImportSpec } from "./importSpec";

/** Flatten every user-entered résumé string into one blob for coverage scanning. */
export function collectResumeText(data: ResumeData): string {
  const parts: string[] = [data.name, data.headline, data.summary, ...Object.values(data.contact)];
  for (const e of data.experience) parts.push(e.role, e.company, e.location, ...e.bullets);
  for (const e of data.education) parts.push(e.institution, e.degree, e.location, e.detail);
  for (const s of data.skills) parts.push(s.label, ...s.items);
  return parts.join(" ");
}

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "Résumé",
  defaultData: sampleResume,
  importSpec: resumeImportSpec,
  templates: [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate],
  collectText: collectResumeText,
};
