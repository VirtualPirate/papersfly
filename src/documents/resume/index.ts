import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/classic";
import { resumeSchema } from "./schema";

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "Résumé",
  schema: resumeSchema,
  defaultData: sampleResume,
  templates: [classicTemplate],
};
