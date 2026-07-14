import { describe, it, expect } from "vitest";
import { coverLetterDocument } from "./index";
import { sampleCoverLetter } from "../../data/coverLetter";

describe("coverLetterDocument", () => {
  it("collectText covers every user string", () => {
    const text = coverLetterDocument.collectText(sampleCoverLetter);
    for (const s of [
      "Jordan Avery Chen",
      "jordan.chen@example.com",
      "July 14, 2026",
      "Priya Raman",
      "Lumenware",
      "ENG-4127",
      "Dear Ms. Raman,",
      "Northwind Labs",
      "Sincerely,",
    ]) {
      expect(text).toContain(s);
    }
  });

  it("ships five templates", () => {
    expect(coverLetterDocument.templates.map((t) => t.id)).toEqual([
      "cameo",
      "strata",
      "carbon",
      "missive",
      "foundry",
    ]);
  });
});
