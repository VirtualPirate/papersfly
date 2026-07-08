import { lazyTemplate } from "../../lazyTemplate";
import { resumeSchema } from "../../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../../theme/variants";

export const meridianTemplate = lazyTemplate(
  {
    id: "meridian",
    name: "Meridian",
    description: "Modern accent header band",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "navy", fontId: "classic" } },
  },
  () => import("./MeridianPreview"),
);
