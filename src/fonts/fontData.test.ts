import { describe, it, expect } from "vitest";
import { FONT_LOADERS } from "./fontData";
import { FONT_LIBRARY, type FontId } from "./library";

// Each family's weight files must resolve to base64 through its own loader
// chunk. Driven off FONT_LIBRARY so it can't drift from the shipped families.
describe("FONT_LOADERS", () => {
  it("has a loader for every library family", () => {
    for (const font of FONT_LIBRARY) {
      expect(FONT_LOADERS[font.id], font.id).toBeTypeOf("function");
    }
  });

  it.each(FONT_LIBRARY.map((f) => f.id as FontId))(
    "loads base64 for every weight of %s",
    async (id) => {
      const font = FONT_LIBRARY.find((f) => f.id === id)!;
      const data = await FONT_LOADERS[id]();
      for (const w of font.weights) {
        expect(data[w.file], w.file).toBeTypeOf("string");
        expect(data[w.file].length, w.file).toBeGreaterThan(1000);
      }
    },
  );
});
