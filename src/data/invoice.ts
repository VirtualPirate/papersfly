/**
 * The invoice CONTENT, fully decoupled from the DESIGN (mirrors data/resume.ts).
 * Money is never stored here — computeTotals() derives every amount from
 * quantity × rate. Templates render computed values and hide empty optional
 * fields (poNumber, discount, taxes, amountPaid, payment, notes).
 */
export interface InvoiceContact {
  name: string;
  line2: string;        // sender tagline / client "Attn: …"
  address: string[];    // address lines
  detail: string;       // small ref line — EIN / VAT / contact
}

export interface LineItem {
  id: string;
  description: string;
  detail: string;       // secondary line under the description
  quantity: number;
  unit: string;         // display unit, e.g. "hrs" ("" ⇒ none)
  rate: number;
}

export interface TaxLine {
  id: string;
  label: string;        // e.g. "Sales tax (8.5%)"
  rate: number;         // percent
}

export interface InvoiceData {
  title: string;        // "Invoice" — overridable
  number: string;
  issueDate: string;
  dueDate: string;
  terms: string;
  poNumber: string;     // "" ⇒ hidden
  currency: string;     // ISO 4217 code, e.g. "USD"

  from: InvoiceContact;
  billTo: InvoiceContact;

  items: LineItem[];

  discountLabel: string;
  discountKind: "percent" | "amount";
  discountValue: number; // 0 ⇒ hidden
  taxes: TaxLine[];      // [] ⇒ hidden

  amountPaidLabel: string;
  amountPaid: number;    // 0 ⇒ balance = total

  paymentLabel: string;
  paymentLines: string[];
  notes: string;
}

export const sampleInvoice: InvoiceData = {
  title: "Invoice",
  number: "INV-2026-0114",
  issueDate: "Jul 8, 2026",
  dueDate: "Aug 7, 2026",
  terms: "Net 30",
  poNumber: "PO-4471",
  currency: "USD",
  from: {
    name: "Atelier Nord",
    line2: "Design & Brand Studio",
    address: ["42 Warehouse Lane, Studio 3", "Portland, OR 97209", "hello@ateliernord.co", "(503) 555-0172"],
    detail: "EIN 47-2938471",
  },
  billTo: {
    name: "Cascadia Coffee Roasters",
    line2: "Attn: Mara Whitfield",
    address: ["1180 SE Belmont Street", "Portland, OR 97214"],
    detail: "",
  },
  items: [
    { id: "li-1", description: "Brand identity system", detail: "Logo suite, type & color palette", quantity: 1, unit: "", rate: 6800 },
    { id: "li-2", description: "Packaging design", detail: "Three retail SKUs", quantity: 3, unit: "", rate: 1450 },
    { id: "li-3", description: "Website design", detail: "Six responsive pages", quantity: 1, unit: "", rate: 5200 },
    { id: "li-4", description: "Photography art direction", detail: "On-site, half day", quantity: 8, unit: "hrs", rate: 145 },
  ],
  discountLabel: "Returning client (5%)",
  discountKind: "percent",
  discountValue: 5,
  taxes: [{ id: "tx-1", label: "Sales tax (8.5%)", rate: 8.5 }],
  amountPaidLabel: "Deposit received",
  amountPaid: 5000,
  paymentLabel: "Payment",
  paymentLines: ["Cascade Credit Union", "Routing 123 456 789", "Account 000 112 223", "ateliernord.co/pay"],
  notes: "Thank you for your business. Balances unpaid after the due date accrue interest at 1.5% per month.",
};
