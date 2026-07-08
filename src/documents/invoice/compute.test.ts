import { describe, it, expect } from "vitest";
import { computeTotals, formatMoney } from "./compute";
import { sampleInvoice } from "../../data/invoice";
import type { InvoiceData } from "../../data/invoice";

describe("computeTotals", () => {
  it("computes the sample invoice end to end", () => {
    const t = computeTotals(sampleInvoice);
    expect(t.lineAmounts).toEqual([6800, 4350, 5200, 1160]);
    expect(t.subtotal).toBe(17510);
    expect(t.discount).toBe(875.5);          // 5% of 17510
    expect(t.taxable).toBe(16634.5);
    expect(t.taxes[0].amount).toBe(1413.93);  // 8.5% of 16634.5, rounded
    expect(t.taxTotal).toBe(1413.93);
    expect(t.total).toBe(18048.43);
    expect(t.amountPaid).toBe(5000);
    expect(t.balanceDue).toBe(13048.43);
  });

  it("supports a flat-amount discount", () => {
    const inv: InvoiceData = { ...sampleInvoice, discountKind: "amount", discountValue: 1000, taxes: [] };
    const t = computeTotals(inv);
    expect(t.discount).toBe(1000);
    expect(t.taxable).toBe(16510);
    expect(t.total).toBe(16510);
  });

  it("sums multiple tax lines on the discounted base", () => {
    const inv: InvoiceData = {
      ...sampleInvoice, discountValue: 0,
      taxes: [{ id: "a", label: "GST 5%", rate: 5 }, { id: "b", label: "PST 7%", rate: 7 }],
    };
    const t = computeTotals(inv);
    expect(t.taxable).toBe(17510);
    expect(t.taxes.map((x) => x.amount)).toEqual([875.5, 1225.7]);
    expect(t.taxTotal).toBe(2101.2);
    expect(t.total).toBe(19611.2);
  });

  it("never lets a discount push the taxable base below zero", () => {
    const inv: InvoiceData = { ...sampleInvoice, discountKind: "amount", discountValue: 999999, taxes: [] };
    const t = computeTotals(inv);
    expect(t.taxable).toBe(0);
    expect(t.total).toBe(0);
  });

  it("treats amountPaid 0 as balance = total", () => {
    const inv: InvoiceData = { ...sampleInvoice, amountPaid: 0 };
    const t = computeTotals(inv);
    expect(t.balanceDue).toBe(t.total);
  });
});

describe("formatMoney", () => {
  it("formats known currencies with a narrow symbol", () => {
    expect(formatMoney(1413.93, "USD")).toBe("$1,413.93");
    expect(formatMoney(1000, "EUR")).toBe("€1,000.00");
  });
  it("falls back to a $-prefixed number for an invalid currency code", () => {
    expect(formatMoney(1000, "NOPE")).toMatch(/^\$1,000\.00$/);
  });
});
