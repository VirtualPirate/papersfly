import { describe, it, expect } from "vitest";
import {
  COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT,
  SPACING_PRESETS, DEFAULT_SPACING_ID,
  resolveVariant, resolveVariantFontIds, type Variant,
} from "./variants";
import { getFont } from "../fonts/library";

describe("variant catalog", () => {
  it("ships 4 color schemes and 4 font pairings with unique ids", () => {
    expect(COLOR_SCHEMES.map((c) => c.id)).toEqual(["navy", "charcoal", "burgundy", "forest"]);
    expect(FONT_PAIRINGS.map((f) => f.id)).toEqual(["classic", "editorial", "modern", "mono"]);
    expect(new Set(COLOR_SCHEMES.map((c) => c.id)).size).toBe(4);
    expect(new Set(FONT_PAIRINGS.map((f) => f.id)).size).toBe(4);
  });

  it("references only real library fonts", () => {
    for (const f of FONT_PAIRINGS) {
      expect(getFont(f.display)).toBeDefined();
      expect(getFont(f.body)).toBeDefined();
    }
  });

  it("has a default that reproduces today's look (navy + Source Serif + Inter)", () => {
    expect(DEFAULT_VARIANT).toEqual({ colorId: "navy", fontId: "classic" });
    expect(resolveVariant(DEFAULT_VARIANT)).toEqual({
      accent: "#1f3a5f",
      displayStack: '"SourceSerif", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
      sectionScale: 1,
    });
  });

  it("resolves a non-default variant to its accent and font stacks", () => {
    expect(resolveVariant({ colorId: "burgundy", fontId: "editorial" })).toEqual({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
      sectionScale: 1,
    });
  });

  it("falls back to the default for unknown ids", () => {
    expect(resolveVariant({ colorId: "bogus", fontId: "bogus" } as Variant)).toEqual(
      resolveVariant(DEFAULT_VARIANT),
    );
  });

  it("returns the display+body font ids for embedding, deduped", () => {
    expect(new Set(resolveVariantFontIds({ colorId: "navy", fontId: "mono" }))).toEqual(
      new Set(["plexMono", "inter"]),
    );
    // Modern uses one family for both slots.
    expect(resolveVariantFontIds({ colorId: "navy", fontId: "modern" })).toEqual(["plexSans"]);
  });
});

describe("spacing presets", () => {
  it("ships compact/default/relaxed with unique ids and a default id", () => {
    expect(SPACING_PRESETS.map((s) => s.id)).toEqual(["compact", "default", "relaxed"]);
    expect(new Set(SPACING_PRESETS.map((s) => s.id)).size).toBe(3);
    expect(DEFAULT_SPACING_ID).toBe("default");
  });

  it("resolves spacingId to a section-gap scale, defaulting to 1 when absent", () => {
    expect(resolveVariant({ colorId: "navy", fontId: "classic" }).sectionScale).toBe(1);
    expect(
      resolveVariant({ colorId: "navy", fontId: "classic", spacingId: "compact" }).sectionScale,
    ).toBe(0.5);
    expect(
      resolveVariant({ colorId: "navy", fontId: "classic", spacingId: "relaxed" }).sectionScale,
    ).toBe(1.75);
  });

  it("falls back to the default scale for an unknown spacingId", () => {
    expect(
      resolveVariant({ colorId: "navy", fontId: "classic", spacingId: "bogus" }).sectionScale,
    ).toBe(1);
  });
});
