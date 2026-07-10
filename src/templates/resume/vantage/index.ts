import { lazyTemplate } from "../../lazyTemplate";
import { resumeSchema } from "../../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../../theme/variants";

export const vantageTemplate = lazyTemplate(
  {
    id: "vantage",
    name: "Vantage",
    description: "Two-column with header band",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "navy", fontId: "modern" } },
  },
  () => import("./VantagePreview"),
);
