import { describe, it, expect } from "vitest";
import { invoiceDocument, collectInvoiceText } from "./index";
import { sampleInvoice } from "../../data/invoice";

describe("invoiceDocument", () => {
  it("bundles id, sample data, import spec and four templates", () => {
    expect(invoiceDocument.id).toBe("invoice");
    expect(invoiceDocument.defaultData).toBe(sampleInvoice);
    expect(invoiceDocument.templates.map((t) => t.id)).toEqual(["nordic", "sterling", "prism", "bureau"]);
  });
  it("collectText gathers party names, an item and a payment line", () => {
    const text = collectInvoiceText(sampleInvoice);
    expect(text).toContain("Atelier Nord");
    expect(text).toContain("Cascadia Coffee Roasters");
    expect(text).toContain("Brand identity system");
    expect(text).toContain("Cascade Credit Union");
  });
});
