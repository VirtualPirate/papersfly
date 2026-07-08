import type { DocumentType } from "../types";
import type { InvoiceData } from "../../data/invoice";
import { sampleInvoice } from "../../data/invoice";
import { invoiceImportSpec } from "./importSpec";
import { nordicTemplate } from "../../templates/invoice/nordic";
import { sterlingTemplate } from "../../templates/invoice/sterling";
import { prismTemplate } from "../../templates/invoice/prism";
import { bureauTemplate } from "../../templates/invoice/bureau";

/** Flatten every user-entered invoice string (plus the currency symbol) for the
 *  font-coverage scan. */
export function collectInvoiceText(data: InvoiceData): string {
  const parts: string[] = [data.title, data.number, data.issueDate, data.dueDate, data.terms, data.poNumber, data.currency];
  for (const c of [data.from, data.billTo]) parts.push(c.name, c.line2, c.detail, ...c.address);
  for (const it of data.items) parts.push(it.description, it.detail, it.unit);
  parts.push(data.discountLabel, ...data.taxes.map((t) => t.label), data.amountPaidLabel);
  parts.push(data.paymentLabel, ...data.paymentLines, data.notes);
  try {
    parts.push((0).toLocaleString("en-US", { style: "currency", currency: data.currency, currencyDisplay: "narrowSymbol" }));
  } catch { /* invalid code — the plain "$" fallback needs no glyph check */ }
  return parts.join(" ");
}

export const invoiceDocument: DocumentType<InvoiceData> = {
  id: "invoice",
  name: "Invoice",
  defaultData: sampleInvoice,
  importSpec: invoiceImportSpec,
  templates: [nordicTemplate, sterlingTemplate, prismTemplate, bureauTemplate],
  collectText: collectInvoiceText,
};
