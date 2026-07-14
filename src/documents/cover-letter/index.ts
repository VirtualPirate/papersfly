import type { DocumentType } from "../types";
import type { CoverLetterData } from "../../data/coverLetter";
import { sampleCoverLetter } from "../../data/coverLetter";
import { cameoTemplate } from "../../templates/cover-letter/cameo";
import { strataTemplate } from "../../templates/cover-letter/strata";
import { carbonTemplate } from "../../templates/cover-letter/carbon";
import { missiveTemplate } from "../../templates/cover-letter/missive";
import { foundryTemplate } from "../../templates/cover-letter/foundry";
import { coverLetterImportSpec } from "./importSpec";

/** Flatten every user-entered cover-letter string into one blob for coverage scanning. */
export function collectCoverLetterText(data: CoverLetterData): string {
  const parts: string[] = [
    data.name,
    data.headline,
    ...Object.values(data.contact),
    data.date,
    data.recipient.name,
    data.recipient.title,
    data.recipient.company,
    data.recipient.address,
    data.subject,
    data.salutation,
    ...data.paragraphs.map((p) => p.text),
    data.closing,
    data.signature,
  ];
  return parts.join(" ");
}

export const coverLetterDocument: DocumentType<CoverLetterData> = {
  id: "cover-letter",
  name: "Cover letter",
  defaultData: sampleCoverLetter,
  importSpec: coverLetterImportSpec,
  templates: [cameoTemplate, strataTemplate, carbonTemplate, missiveTemplate, foundryTemplate],
  collectText: collectCoverLetterText,
};
