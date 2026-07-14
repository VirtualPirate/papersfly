import { describe, it, expect } from "vitest";
import {
  CL_FONT_PAIRINGS,
  CAMEO_VARIANTS,
  STRATA_VARIANTS,
  CARBON_VARIANTS,
  MISSIVE_VARIANTS,
  FOUNDRY_VARIANTS,
} from "./variants";

describe("cover-letter template variants", () => {
  const all = { CAMEO_VARIANTS, STRATA_VARIANTS, CARBON_VARIANTS, MISSIVE_VARIANTS, FOUNDRY_VARIANTS };
  it("each offers ≥1 color and uses the cover-letter pairing catalog", () => {
    for (const v of Object.values(all)) {
      expect(v.colors.length).toBeGreaterThan(0);
      expect(v.fonts).toBe(CL_FONT_PAIRINGS);
      // default colorId/fontId must exist in the offered lists
      expect(v.colors.some((c) => c.id === v.default.colorId)).toBe(true);
      expect(v.fonts.some((f) => f.id === v.default.fontId)).toBe(true);
    }
  });

  it("every pairing has a DISTINCT body face — a letter's body is its content, so switching pairings must visibly restyle it", () => {
    const bodies = CL_FONT_PAIRINGS.map((p) => p.body);
    expect(new Set(bodies).size).toBe(bodies.length);
    expect(CL_FONT_PAIRINGS.find((p) => p.id === "editorial")?.body).toBe("lora");
    expect(CL_FONT_PAIRINGS.find((p) => p.id === "mono")?.body).toBe("plexMono");
  });
});
