import type { InvoiceData } from "../../data/invoice";

export interface ComputedTax {
  id: string;
  label: string;
  amount: number;
}

export interface InvoiceTotals {
  lineAmounts: number[];
  subtotal: number;
  discount: number;
  taxable: number;
  taxes: ComputedTax[];
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

/** Round to whole cents, avoiding binary-float drift (e.g. 1413.9325 → 1413.93). */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Derive every monetary figure from the raw invoice. Line amount = quantity ×
 * rate; discount applies at the subtotal; taxes apply to the discounted base;
 * balance = total − amountPaid. The taxable base is clamped at 0.
 */
export function computeTotals(inv: InvoiceData): InvoiceTotals {
  const lineAmounts = inv.items.map((it) => r2(it.quantity * it.rate));
  const subtotal = r2(lineAmounts.reduce((s, n) => s + n, 0));

  const rawDiscount = inv.discountKind === "percent"
    ? subtotal * (inv.discountValue / 100)
    : inv.discountValue;
  const discount = r2(Math.max(0, rawDiscount));
  const taxable = r2(Math.max(0, subtotal - discount));

  const taxes: ComputedTax[] = inv.taxes.map((t) => ({
    id: t.id,
    label: t.label,
    amount: r2(taxable * (t.rate / 100)),
  }));
  const taxTotal = r2(taxes.reduce((s, t) => s + t.amount, 0));
  const total = r2(taxable + taxTotal);
  const amountPaid = r2(inv.amountPaid);
  const balanceDue = r2(total - amountPaid);

  return { lineAmounts, subtotal, discount, taxable, taxes, taxTotal, total, amountPaid, balanceDue };
}

/**
 * Format an amount for the given ISO 4217 currency using a narrow symbol and
 * fixed en-US grouping (deterministic across environments). Falls back to a
 * "$"-prefixed grouped number when the code is not valid.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
