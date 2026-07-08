import { builder, type FormSchema } from "../../forms/schema";
import type { InvoiceData, LineItem, TaxLine } from "../../data/invoice";

export const makeBlankItem = (): Omit<LineItem, "id"> => ({
  description: "Item",
  detail: "",
  quantity: 1,
  unit: "",
  rate: 0,
});

export const makeBlankTax = (): Omit<TaxLine, "id"> => ({
  label: "Tax",
  rate: 0,
});

const b = builder<InvoiceData>();

export const invoiceSchema: FormSchema<InvoiceData> = [
  b.section("Details", [
    b.field("title", "Document title", { control: "text", placeholder: "Invoice" }),
    b.row(
      b.field("number", "Invoice number"),
      b.field("currency", "Currency", { control: "text", placeholder: "ISO code, e.g. USD" }),
    ),
    b.row(b.field("issueDate", "Issue date"), b.field("dueDate", "Due date")),
    b.row(b.field("terms", "Terms"), b.field("poNumber", "P.O. number")),
  ]),
  b.section("Parties", [
    b.group("from", (f) => [
      f.field("name", "Your name / business"),
      f.field("line2", "Tagline"),
      f.lines("address", "Address (one line each)", { rows: 3 }),
      f.field("detail", "Tax ID / reference"),
    ]),
    b.group("billTo", (c) => [
      c.field("name", "Client name"),
      c.field("line2", "Attention"),
      c.lines("address", "Address (one line each)", { rows: 3 }),
      c.field("detail", "Client reference"),
    ]),
  ]),
  b.list("items", "Line items", makeBlankItem, (it) => [
    it.field("description", "Description"),
    it.field("detail", "Detail"),
    it.row(it.number("quantity", "Qty"), it.field("unit", "Unit"), it.number("rate", "Rate")),
  ]),
  b.section("Adjustments", [
    b.field("discountLabel", "Discount label"),
    b.row(
      b.select("discountKind", "Discount type", [
        { value: "percent", label: "Percent (%)" },
        { value: "amount", label: "Fixed amount" },
      ]),
      b.number("discountValue", "Discount value"),
    ),
    b.row(b.field("amountPaidLabel", "Amount-paid label"), b.number("amountPaid", "Amount paid")),
  ]),
  b.list("taxes", "Taxes", makeBlankTax, (t) => [
    t.row(t.field("label", "Tax label"), t.number("rate", "Rate (%)")),
  ]),
  b.section("Payment", [
    b.field("paymentLabel", "Payment heading"),
    b.lines("paymentLines", "Payment details (one line each)", { rows: 4 }),
    b.textarea("notes", "Notes", { rows: 3 }),
  ]),
];
