import { describe, it, expect } from "vitest";
import { templates, defaultTemplate } from "./registry";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("template registry", () => {
  it("ships the templates in gallery order with unique ids", () => {
    expect(templates.map((t) => t.id)).toEqual([
      "classic", "meridian", "quill", "ledger", "atlas", "vantage",
    ]);
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
    expect(defaultTemplate).toBe(templates[0]);
  });

  it("gives every template a non-empty variant catalog and a valid default", () => {
    const colorIds = new Set(COLOR_SCHEMES.map((c) => c.id));
    const fontIds = new Set(FONT_PAIRINGS.map((f) => f.id));
    for (const t of templates) {
      expect(t.variants.colors.length).toBeGreaterThan(0);
      expect(t.variants.fonts.length).toBeGreaterThan(0);
      expect(colorIds.has(t.variants.default.colorId)).toBe(true);
      expect(fontIds.has(t.variants.default.fontId)).toBe(true);
    }
  });
});
