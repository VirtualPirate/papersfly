import { describe, it, expect } from "vitest";
import { NORDIC_VARIANTS, STERLING_VARIANTS, PRISM_VARIANTS, BUREAU_VARIANTS } from "./variants";
import { FONT_PAIRINGS } from "../../theme/variants";

describe("invoice template variants", () => {
  const all = { NORDIC_VARIANTS, STERLING_VARIANTS, PRISM_VARIANTS, BUREAU_VARIANTS };
  it("each offers ≥1 color and reuses the shared font catalog", () => {
    for (const v of Object.values(all)) {
      expect(v.colors.length).toBeGreaterThan(0);
      expect(v.fonts).toBe(FONT_PAIRINGS);
      // default colorId/fontId must exist in the offered lists
      expect(v.colors.some((c) => c.id === v.default.colorId)).toBe(true);
      expect(v.fonts.some((f) => f.id === v.default.fontId)).toBe(true);
    }
  });
});
