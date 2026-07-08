import { describe, it, expect } from "vitest";
import { resumeImportSpec } from "./importSpec";
import { resumeDocument } from "./index";
import { sampleResume } from "../../data/resume";

const contentKeys = (o: object) => Object.keys(o).filter((k) => k !== "id").sort();

describe("resumeImportSpec", () => {
  it("mirrors the top-level content keys of ResumeData", () => {
    expect(Object.keys(resumeImportSpec).sort()).toEqual(contentKeys(sampleResume));
  });

  it("mirrors each list item's content keys", () => {
    const exp = resumeImportSpec.experience;
    if (exp.type !== "list") throw new Error("experience must be a list");
    expect(Object.keys(exp.item).sort()).toEqual(contentKeys(sampleResume.experience[0]));

    const sk = resumeImportSpec.skills;
    if (sk.type !== "list") throw new Error("skills must be a list");
    expect(Object.keys(sk.item).sort()).toEqual(contentKeys(sampleResume.skills[0]));
  });

  it("is attached to the resume document", () => {
    expect(resumeDocument.importSpec).toBe(resumeImportSpec);
  });
});
