import { describe, it, expect } from "vitest";
import { faqPageJsonLd, ALTERNATIVES_FAQ } from "./competitors";

describe("faqPageJsonLd", () => {
  it("builds a FAQPage node with one Question per entry, answers wrapped in <p>", () => {
    const node = faqPageJsonLd([
      { q: "Is it free?", a: "Yes, entirely." },
      { q: "Any signup?", a: "No account needed." },
    ]);
    expect(node["@context"]).toBe("https://schema.org");
    expect(node["@type"]).toBe("FAQPage");
    expect(node.mainEntity).toHaveLength(2);
    expect(node.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: { "@type": "Answer", text: "<p>Yes, entirely.</p>" },
    });
  });
});

describe("ALTERNATIVES_FAQ", () => {
  it("has at least 4 non-empty Q&A entries", () => {
    expect(ALTERNATIVES_FAQ.length).toBeGreaterThanOrEqual(4);
    for (const f of ALTERNATIVES_FAQ) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.a.trim().length).toBeGreaterThan(0);
    }
  });

  it("produces a valid FAQPage when passed through the helper", () => {
    const node = faqPageJsonLd(ALTERNATIVES_FAQ);
    expect(node["@type"]).toBe("FAQPage");
    expect(node.mainEntity.length).toBe(ALTERNATIVES_FAQ.length);
  });
});
