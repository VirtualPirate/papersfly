import { describe, it, expect } from "vitest";
import {
  faqPageJsonLd,
  ALTERNATIVES_FAQ,
  competitors,
  SWITCH_STEPS,
  PRICING_AS_OF,
  PRICING_YEAR,
  PRICING_ISO,
} from "./competitors";

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

describe("competitors — comparison-page SEO fields", () => {
  it("every competitor has a non-empty altSummary", () => {
    for (const c of competitors) {
      expect(c.altSummary.trim().length, `${c.slug} altSummary`).toBeGreaterThan(0);
    }
  });

  it("every meta description targets the '<name> alternative' keyword", () => {
    for (const c of competitors) {
      expect(/alternative/i.test(c.description), `${c.slug} description`).toBe(true);
    }
  });
});

describe("SWITCH_STEPS", () => {
  it("has steps and references the {name} token for interpolation", () => {
    expect(SWITCH_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(SWITCH_STEPS.some((s) => s.includes("{name}"))).toBe(true);
  });
});

describe("pricing freshness constants", () => {
  it("PRICING_AS_OF, PRICING_YEAR and PRICING_ISO agree on the year", () => {
    expect(PRICING_AS_OF).toContain(String(PRICING_YEAR));
    expect(PRICING_ISO.startsWith(String(PRICING_YEAR))).toBe(true);
    expect(PRICING_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
