import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { PRISM_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const prismTemplate = lazyTemplate<InvoiceData>(
  {
    id: "prism",
    name: "Prism",
    description: "Bold brand rail with an oversized wordmark",
    schema: invoiceSchema,
    variants: PRISM_VARIANTS,
  },
  () => import("./PrismPreview"),
);
