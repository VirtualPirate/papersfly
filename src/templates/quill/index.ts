import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

export const quillTemplate = lazyTemplate(
  {
    id: "quill",
    name: "Quill",
    description: "Minimalist, centered, editorial",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "charcoal", fontId: "editorial" } },
  },
  () => import("./QuillPreview"),
);
