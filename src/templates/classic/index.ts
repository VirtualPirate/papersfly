import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT } from "../../theme/variants";

/**
 * The classic design. Its component + `classic.css` are reached ONLY through the
 * bare `import("./ClassicPreview")` below, so they land in the template's own
 * chunk rather than the entry bundle. Adding a template repeats exactly this
 * shape — a folder with a component, registered with one dynamic import.
 */
export const classicTemplate = lazyTemplate(
  {
    id: "classic",
    name: "Classic",
    description: "Single-column, editorial serif",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: DEFAULT_VARIANT },
  },
  () => import("./ClassicPreview"),
);
