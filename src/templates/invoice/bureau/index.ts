import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { BUREAU_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const bureauTemplate = lazyTemplate<InvoiceData>(
  {
    id: "bureau",
    name: "Bureau",
    description: "Boxed corporate grid with a filled totals panel",
    schema: invoiceSchema,
    variants: BUREAU_VARIANTS,
  },
  () => import("./BureauPreview"),
);
