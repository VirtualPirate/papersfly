import { lazyTemplate } from "../../lazyTemplate";
import { resumeSchema } from "../../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../../theme/variants";

export const atlasTemplate = lazyTemplate(
  {
    id: "atlas",
    name: "Atlas",
    description: "Two-column sidebar",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "navy", fontId: "modern" } },
  },
  () => import("./AtlasPreview"),
);
