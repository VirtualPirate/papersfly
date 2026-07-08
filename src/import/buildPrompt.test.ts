import { describe, it, expect } from "vitest";
import { buildImportPrompt } from "./buildPrompt";
import { validateAgainstSpec } from "./validate";
import { stripIds } from "./spec";
import { resumeDocument } from "../documents/resume/index";
import type { DocumentType } from "../documents/types";

describe("buildImportPrompt", () => {
  const doc = resumeDocument as unknown as DocumentType<unknown>;
  const prompt = buildImportPrompt(doc);

  it("lists the schema keys and the hard rules", () => {
    expect(prompt).toContain('"experience"');
    expect(prompt).toContain('"bullets"');
    expect(prompt).toContain('"contact"');
    expect(prompt.toLowerCase()).toContain("no markdown code fences");
    expect(prompt).toContain('Do not include any "id" fields');
  });

  it("embeds a filled example (ANTI-DRIFT: the example must itself validate)", () => {
    const example = stripIds(doc.defaultData);
    expect(prompt).toContain(JSON.stringify(example, null, 2));
    expect(validateAgainstSpec(doc.importSpec, example).ok).toBe(true);
  });
});
