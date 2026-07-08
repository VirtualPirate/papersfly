import { describe, it, expect } from "vitest";
import { parseImportJson, validateAgainstSpec, finalizeImport, summarize } from "./validate";
import { resumeImportSpec } from "../documents/resume/importSpec";
import { sampleResume } from "../data/resume";
import { stripIds } from "./spec";

const validContent = () => stripIds(structuredClone(sampleResume)) as unknown as Record<string, unknown>;

describe("parseImportJson", () => {
  it("parses a bare object", () => {
    expect(parseImportJson('{"a":1}')).toEqual({ ok: true, json: { a: 1 } });
  });
  it("strips a ```json fence", () => {
    expect(parseImportJson('```json\n{"a":1}\n```')).toEqual({ ok: true, json: { a: 1 } });
  });
  it("trims prose around the object", () => {
    expect(parseImportJson('Sure! Here you go:\n{"a":1}\nHope that helps')).toEqual({ ok: true, json: { a: 1 } });
  });
  it("reports non-JSON", () => {
    const r = parseImportJson("not json at all");
    expect(r.ok).toBe(false);
  });
});

describe("validateAgainstSpec (strict)", () => {
  it("accepts a full valid résumé", () => {
    const r = validateAgainstSpec(resumeImportSpec, validContent());
    expect(r.ok).toBe(true);
  });
  it("errors on a missing required key", () => {
    const v = validContent(); delete v.contact;
    const r = validateAgainstSpec(resumeImportSpec, v);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.errors).toContainEqual({ path: "contact", message: "required, but missing" });
  });
  it("errors on a wrong type at an indexed path", () => {
    const v = validContent();
    (v.experience as any)[0].bullets = "just one line";
    const r = validateAgainstSpec(resumeImportSpec, v);
    if (!r.ok) expect(r.errors.some((e) => e.path === "experience[0].bullets")).toBe(true);
    else throw new Error("should have failed");
  });
  it("errors on an unknown key", () => {
    const v = validContent(); (v as any).objective = "x";
    const r = validateAgainstSpec(resumeImportSpec, v);
    if (!r.ok) expect(r.errors).toContainEqual({ path: "objective", message: "unknown key — not in the schema" });
    else throw new Error("should have failed");
  });
  it("treats null as a type mismatch, not present-and-empty", () => {
    const v = validContent(); (v as any).contact = null;
    const r = validateAgainstSpec(resumeImportSpec, v);
    expect(r.ok).toBe(false);
  });
});

describe("finalizeImport + summarize", () => {
  it("injects a unique id into every list item", () => {
    const v = validContent();
    const out = finalizeImport(resumeImportSpec, v) as any;
    const ids = [...out.experience, ...out.education, ...out.skills].map((i: any) => i.id);
    expect(ids.every((id: unknown) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("summarizes list counts", () => {
    expect(summarize(resumeImportSpec, validContent())).toBe("3 roles · 1 school · 3 skill groups");
  });
});
