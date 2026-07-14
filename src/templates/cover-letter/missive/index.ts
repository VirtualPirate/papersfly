import { lazyTemplate } from "../../lazyTemplate";
import { coverLetterSchema } from "../../../documents/cover-letter/schema";
import { MISSIVE_VARIANTS } from "../variants";
import type { CoverLetterData } from "../../../data/coverLetter";

export const missiveTemplate = lazyTemplate<CoverLetterData>(
  {
    id: "missive",
    name: "Missive",
    description: "The salutation is the headline",
    schema: coverLetterSchema,
    variants: MISSIVE_VARIANTS,
  },
  () => import("./MissivePreview"),
);
