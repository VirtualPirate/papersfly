import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/classic";

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "Résumé",
  defaultData: sampleResume,
  templates: [classicTemplate],
};
