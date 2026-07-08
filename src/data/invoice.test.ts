import { describe, it, expect } from "vitest";
import { sampleInvoice } from "./invoice";

describe("sampleInvoice", () => {
  it("is a fully populated invoice exercising every optional field", () => {
    expect(sampleInvoice.currency).toBe("USD");
    expect(sampleInvoice.items).toHaveLength(4);
    expect(sampleInvoice.taxes.length).toBeGreaterThan(0);
    expect(sampleInvoice.discountValue).toBeGreaterThan(0);
    expect(sampleInvoice.amountPaid).toBeGreaterThan(0);
    expect(sampleInvoice.from.name).toBe("Atelier Nord");
    expect(sampleInvoice.billTo.name).toBe("Cascadia Coffee Roasters");
  });

  it("uses numeric quantity/rate on every line and numeric tax rate", () => {
    for (const it of sampleInvoice.items) {
      expect(typeof it.quantity).toBe("number");
      expect(typeof it.rate).toBe("number");
    }
    for (const t of sampleInvoice.taxes) expect(typeof t.rate).toBe("number");
  });
});
