import { lazyTemplate } from "../../lazyTemplate";
import { coverLetterSchema } from "../../../documents/cover-letter/schema";
import { CAMEO_VARIANTS } from "../variants";
import type { CoverLetterData } from "../../../data/coverLetter";

export const cameoTemplate = lazyTemplate<CoverLetterData>(
  {
    id: "cameo",
    name: "Cameo",
    description: "Engraved stationery with a ruled monogram",
    schema: coverLetterSchema,
    variants: CAMEO_VARIANTS,
  },
  () => import("./CameoPreview"),
);
