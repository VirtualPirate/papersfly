import { describe, it, expect } from "vitest";
import { documents, defaultDocument } from "./registry";
import { sampleResume } from "../data/resume";

describe("document registry", () => {
  it("includes the resume document and uses it as default", () => {
    expect(defaultDocument.id).toBe("resume");
    expect(documents.map((d) => d.id)).toContain("resume");
  });

  it("seeds the resume with the sample data and at least one template", () => {
    expect(defaultDocument.defaultData).toBe(sampleResume);
    expect(defaultDocument.templates.length).toBeGreaterThan(0);
  });

  it("registers the invoice document with four templates", () => {
    const invoice = documents.find((d) => d.id === "invoice");
    expect(invoice).toBeDefined();
    expect(invoice?.templates.length).toBe(4);
  });
});
