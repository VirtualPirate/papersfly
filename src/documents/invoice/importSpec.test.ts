import { describe, it, expect } from "vitest";
import { invoiceImportSpec } from "./importSpec";
import { sampleInvoice } from "../../data/invoice";

const contentKeys = (o: object) => Object.keys(o).filter((k) => k !== "id").sort();

describe("invoiceImportSpec", () => {
  it("mirrors the top-level content keys of InvoiceData", () => {
    expect(Object.keys(invoiceImportSpec).sort()).toEqual(contentKeys(sampleInvoice));
  });
  it("mirrors each line item's content keys", () => {
    const items = invoiceImportSpec.items;
    if (items.type !== "list") throw new Error("items must be a list");
    expect(Object.keys(items.item).sort()).toEqual(contentKeys(sampleInvoice.items[0]));
  });
  it("declares numeric fields as number nodes", () => {
    const items = invoiceImportSpec.items;
    if (items.type !== "list") throw new Error("items must be a list");
    expect(items.item.rate.type).toBe("number");
    expect(items.item.quantity.type).toBe("number");
  });
});
