import { describe, it, expect } from "vitest";
import { sampleCoverLetter } from "./coverLetter";

describe("sampleCoverLetter", () => {
  it("is a complete letter: identity, recipient, subject, 3 paragraphs", () => {
    expect(sampleCoverLetter.name).toBe("Jordan Avery Chen");
    expect(sampleCoverLetter.recipient.company).toBe("Lumenware");
    expect(sampleCoverLetter.subject).not.toMatch(/^re:/i); // templates add their own prefix
    expect(sampleCoverLetter.paragraphs).toHaveLength(3);
    const ids = sampleCoverLetter.paragraphs.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sampleCoverLetter.paragraphs.every((p) => p.text.length > 0)).toBe(true);
  });
});
