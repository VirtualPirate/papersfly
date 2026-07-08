import { type ImportSpec, str, strings, obj, list } from "../../import/spec";

/** The résumé CONTENT contract (mirrors ResumeData minus `id`s). Everything is
 *  required-present; empty "" / [] are valid values. */
export const resumeImportSpec: ImportSpec = {
  name: str(),
  headline: str(),
  contact: obj({
    email: str(),
    phone: str(),
    location: str(),
    website: str(),
    linkedin: str(),
  }),
  summary: str(),
  experience: list({
    role: str(),
    company: str(),
    location: str(),
    start: str(),
    end: str(),
    bullets: strings(),
  }),
  education: list({
    institution: str(),
    degree: str(),
    location: str(),
    start: str(),
    end: str(),
    detail: str(),
  }),
  skills: list({ label: str(), items: strings() }),
};
