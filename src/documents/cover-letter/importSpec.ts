import { type ImportSpec, str, obj, list } from "../../import/spec";

/** The cover-letter CONTENT contract (mirrors CoverLetterData minus `id`s).
 *  Everything is required-present; empty "" / [] are valid values. */
export const coverLetterImportSpec: ImportSpec = {
  name: str(),
  headline: str(),
  contact: obj({
    email: str(),
    phone: str(),
    location: str(),
    website: str(),
    linkedin: str(),
  }),
  date: str(),
  recipient: obj({
    name: str(),
    title: str(),
    company: str(),
    address: str(),
  }),
  subject: str(),
  salutation: str(),
  paragraphs: list({ text: str() }),
  closing: str(),
  signature: str(),
};
