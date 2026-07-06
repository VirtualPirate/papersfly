import { describe, it, expect } from "vitest";
import { FONT_DATA } from "./fontData";

const EXPECTED_FILES = [
  "inter-regular.ttf", "inter-semibold.ttf", "inter-bold.ttf",
  "serif-regular.ttf", "serif-semibold.ttf", "serif-bold.ttf",
  "lora-regular.ttf", "lora-semibold.ttf", "lora-bold.ttf",
  "playfair-regular.ttf", "playfair-semibold.ttf", "playfair-bold.ttf",
  "plexsans-regular.ttf", "plexsans-semibold.ttf", "plexsans-bold.ttf",
  "plexmono-regular.ttf", "plexmono-semibold.ttf", "plexmono-bold.ttf",
];

describe("FONT_DATA", () => {
  it("contains base64 for every expected font file", () => {
    for (const file of EXPECTED_FILES) {
      expect(FONT_DATA[file], file).toBeTypeOf("string");
      expect(FONT_DATA[file].length, file).toBeGreaterThan(1000);
    }
  });
});
