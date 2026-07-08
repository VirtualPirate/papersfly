import { describe, it, expect } from "vitest";
import { str, strings, obj, list, stripIds, isDirty, type ImportSpec } from "./spec";

describe("import spec helpers", () => {
  it("builds nodes with the right type and required default", () => {
    expect(str()).toEqual({ type: "string" });
    expect(strings({ required: false })).toEqual({ type: "strings", required: false });
    const spec: ImportSpec = { c: obj({ a: str() }), xs: list({ b: strings() }) };
    expect(spec.c).toEqual({ type: "object", fields: { a: { type: "string" } } });
    expect(spec.xs).toEqual({ type: "list", item: { b: { type: "strings" } } });
  });

  it("stripIds removes id keys at every depth", () => {
    const input = { id: "x", name: "A", items: [{ id: "1", label: "L" }], nested: { id: "n", ok: true } };
    expect(stripIds(input)).toEqual({ name: "A", items: [{ label: "L" }], nested: { ok: true } });
  });

  it("isDirty compares by value", () => {
    const a = { name: "A", xs: [1, 2] };
    expect(isDirty(a, { name: "A", xs: [1, 2] })).toBe(false);
    expect(isDirty(a, { name: "B", xs: [1, 2] })).toBe(true);
  });
});
