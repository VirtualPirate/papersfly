import { describe, it, expect } from "vitest";
import {
  COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT,
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
    });
  });

  it("resolves a non-default variant to its accent and font stacks", () => {
    expect(resolveVariant({ colorId: "burgundy", fontId: "editorial" })).toEqual({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
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
