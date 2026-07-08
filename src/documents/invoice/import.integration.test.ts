import { describe, it, expect } from "vitest";
import { invoiceDocument } from "./index";
import { invoiceImportSpec } from "./importSpec";
import { sampleInvoice } from "../../data/invoice";
import { buildImportPrompt } from "../../import/buildPrompt";
import { validateAgainstSpec, finalizeImport } from "../../import/validate";
import { stripIds } from "../../import/spec";
import type { DocumentType } from "../types";

describe("invoice AI-import round-trip", () => {
  it("describes numeric fields as `number` in the generated prompt", () => {
    const prompt = buildImportPrompt(invoiceDocument as DocumentType<unknown>);
    // the outline lists content keys with their types; quantity/rate/discountValue are numeric
    expect(prompt).toContain('"quantity": number');
    expect(prompt).toContain('"rate": number');
    expect(prompt).toContain('"discountValue": number');
  });

  it("validates and finalizes id-stripped sample data without errors", () => {
    const stripped = stripIds(structuredClone(sampleInvoice)) as unknown as Record<string, unknown>;
    const res = validateAgainstSpec(invoiceImportSpec, stripped);
    expect(res.ok).toBe(true);
    if (res.ok) {
      // numeric strings the AI might emit are coerced back to numbers
      const withStrings = { ...stripped, discountValue: "5" };
      const r2 = validateAgainstSpec(invoiceImportSpec, withStrings);
      expect(r2.ok).toBe(true);
      if (r2.ok) expect(r2.value.discountValue).toBe(5);
      // finalize injects ids on list items
      const final = finalizeImport(invoiceImportSpec, res.value) as { items: { id: string }[] };
      expect(final.items.every((it) => typeof it.id === "string" && it.id.length > 0)).toBe(true);
    }
  });
});
