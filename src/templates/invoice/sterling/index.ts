import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { STERLING_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const sterlingTemplate = lazyTemplate<InvoiceData>(
  {
    id: "sterling",
    name: "Sterling",
    description: "Engraved serif masthead with double rules",
    schema: invoiceSchema,
    variants: STERLING_VARIANTS,
  },
  () => import("./SterlingPreview"),
);
