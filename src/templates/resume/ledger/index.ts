import { lazyTemplate } from "../../lazyTemplate";
import { resumeSchema } from "../../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../../theme/variants";

export const ledgerTemplate = lazyTemplate(
  {
    id: "ledger",
    name: "Ledger",
    description: "Compact, dense, one page",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "charcoal", fontId: "classic" } },
  },
  () => import("./LedgerPreview"),
);
