import { describe, it, expect } from "vitest";
import { coverLetterImportSpec } from "./importSpec";
import { sampleCoverLetter } from "../../data/coverLetter";

const contentKeys = (o: object) => Object.keys(o).filter((k) => k !== "id").sort();

describe("coverLetterImportSpec", () => {
  it("mirrors the top-level content keys of CoverLetterData", () => {
    expect(Object.keys(coverLetterImportSpec).sort()).toEqual(contentKeys(sampleCoverLetter));
  });

  it("mirrors the paragraph item's content keys", () => {
    const p = coverLetterImportSpec.paragraphs;
    if (p.type !== "list") throw new Error("paragraphs must be a list");
    expect(Object.keys(p.item).sort()).toEqual(contentKeys(sampleCoverLetter.paragraphs[0]));
  });
});
