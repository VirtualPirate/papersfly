import { describe, it, expect } from "vitest";
import { resumeDocument } from "./index";
import { sampleResume } from "../../data/resume";

describe("resumeDocument.collectText", () => {
  it("returns one blob containing the name, a company and a skill", () => {
    const text = resumeDocument.collectText(sampleResume);
    expect(text).toContain("Jordan Avery Chen");
    expect(text).toContain("Northwind Labs");
    expect(text).toContain("TypeScript");
  });
});
