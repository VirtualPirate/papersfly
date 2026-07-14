import { lazyTemplate } from "../../lazyTemplate";
import { coverLetterSchema } from "../../../documents/cover-letter/schema";
import { CARBON_VARIANTS } from "../variants";
import type { CoverLetterData } from "../../../data/coverLetter";

export const carbonTemplate = lazyTemplate<CoverLetterData>(
  {
    id: "carbon",
    name: "Carbon",
    description: "Typewritten routing block, stamp-red subject",
    schema: coverLetterSchema,
    variants: CARBON_VARIANTS,
  },
  () => import("./CarbonPreview"),
);
