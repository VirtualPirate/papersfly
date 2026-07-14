import { describe, it, expect } from "vitest";
import { coverLetterSchema, makeBlankParagraph } from "./schema";

describe("coverLetterSchema", () => {
  it("has Sender/Recipient/Letter/Sign-off sections and a paragraphs list", () => {
    const kinds = coverLetterSchema.map((b) => b.kind);
    expect(kinds.filter((k) => k === "section")).toHaveLength(4);
    const list = coverLetterSchema.find((b) => b.kind === "array");
    expect(list && "key" in list && list.key).toBe("paragraphs");
  });

  it("exposes every top-level letter field — including the salutation", () => {
    const keys = new Set<string>();
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.kind === "field") keys.add(n.key);
        if (n.kind === "row") walk(n.fields);
        if (n.kind === "section") walk(n.children);
      }
    };
    walk(coverLetterSchema as any[]);
    for (const k of ["name", "headline", "date", "subject", "salutation", "closing", "signature"]) {
      expect(keys).toContain(k);
    }
  });
  it("blank paragraph is a single empty text", () => {
    expect(makeBlankParagraph()).toEqual({ text: "" });
  });
});
