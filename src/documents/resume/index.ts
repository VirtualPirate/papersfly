import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/classic";
import { meridianTemplate } from "../../templates/meridian";
import { quillTemplate } from "../../templates/quill";
import { ledgerTemplate } from "../../templates/ledger";
import { atlasTemplate } from "../../templates/atlas";

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "Résumé",
  defaultData: sampleResume,
  templates: [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate],
};
