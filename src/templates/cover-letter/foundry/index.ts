import { lazyTemplate } from "../../lazyTemplate";
import { coverLetterSchema } from "../../../documents/cover-letter/schema";
import { FOUNDRY_VARIANTS } from "../variants";
import type { CoverLetterData } from "../../../data/coverLetter";

export const foundryTemplate = lazyTemplate<CoverLetterData>(
  {
    id: "foundry",
    name: "Foundry",
    description: "A giant ghost initial behind a quiet header",
    schema: coverLetterSchema,
    variants: FOUNDRY_VARIANTS,
  },
  () => import("./FoundryPreview"),
);
