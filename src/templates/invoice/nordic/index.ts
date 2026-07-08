import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { NORDIC_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const nordicTemplate = lazyTemplate<InvoiceData>(
  {
    id: "nordic",
    name: "Nordic",
    description: "Minimal Swiss grid; balance due in signal red",
    schema: invoiceSchema,
    variants: NORDIC_VARIANTS,
  },
  () => import("./NordicPreview"),
);
