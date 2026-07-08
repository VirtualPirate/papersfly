import { type ImportSpec, str, strings, num, obj, list } from "../../import/spec";

const contact = obj({
  name: str(),
  line2: str(),
  address: strings(),
  detail: str(),
});

/** The invoice CONTENT contract (mirrors InvoiceData minus `id`s). */
export const invoiceImportSpec: ImportSpec = {
  title: str(),
  number: str(),
  issueDate: str(),
  dueDate: str(),
  terms: str(),
  poNumber: str(),
  currency: str(),
  from: contact,
  billTo: contact,
  items: list({
    description: str(),
    detail: str(),
    quantity: num(),
    unit: str(),
    rate: num(),
  }),
  discountLabel: str(),
  discountKind: str(),
  discountValue: num(),
  taxes: list({ label: str(), rate: num() }),
  amountPaidLabel: str(),
  amountPaid: num(),
  paymentLabel: str(),
  paymentLines: strings(),
  notes: str(),
};
