import { lazyTemplate } from "../../lazyTemplate";
import { coverLetterSchema } from "../../../documents/cover-letter/schema";
import { STRATA_VARIANTS } from "../variants";
import type { CoverLetterData } from "../../../data/coverLetter";

export const strataTemplate = lazyTemplate<CoverLetterData>(
  {
    id: "strata",
    name: "Strata",
    description: "Swiss routing grid under a bold rule",
    schema: coverLetterSchema,
    variants: STRATA_VARIANTS,
  },
  () => import("./StrataPreview"),
);
