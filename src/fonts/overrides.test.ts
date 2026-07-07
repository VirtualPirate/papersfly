import { describe, it, expect } from "vitest";
import {
  joinPath, fontStyleFor, usedFontIds, setFontOverride, BASELINE_FONT_IDS,
  type FontOverrides,
} from "./overrides";

describe("joinPath", () => {
  it("returns the key at root and dotted path otherwise", () => {
    expect(joinPath("", "name")).toBe("name");
    expect(joinPath("contact", "email")).toBe("contact.email");
    expect(joinPath("experience.exp-1", "role")).toBe("experience.exp-1.role");
  });
});

describe("fontStyleFor", () => {
  it("returns undefined when no override and a fontFamily style when set", () => {
    expect(fontStyleFor({}, "name")).toBeUndefined();
    expect(fontStyleFor({ name: "lora" }, "name")).toEqual({
      fontFamily: '"Lora", Georgia, serif',
    });
  });
});

describe("usedFontIds", () => {
  it("always includes the baseline and adds known override fonts", () => {
    expect(usedFontIds({})).toEqual(BASELINE_FONT_IDS);
    expect(new Set(usedFontIds({ name: "lora", "contact.email": "plexMono" }))).toEqual(
      new Set(["inter", "sourceSerif", "lora", "plexMono"]),
    );
  });
  it("ignores unknown font ids", () => {
    expect(new Set(usedFontIds({ name: "bogus" } as unknown as FontOverrides))).toEqual(new Set(["inter", "sourceSerif"]));
  });
  it("unions caller-supplied base ids with override fonts", () => {
    expect(new Set(usedFontIds({ name: "lora" }, ["playfair", "inter"]))).toEqual(
      new Set(["playfair", "inter", "lora"]),
    );
  });
});

describe("setFontOverride", () => {
  it("sets immutably and deletes on null", () => {
    const a = setFontOverride({}, "name", "lora");
    expect(a).toEqual({ name: "lora" });
    const b = setFontOverride(a, "name", null);
    expect(b).toEqual({});
    expect(a).toEqual({ name: "lora" }); // original untouched
  });
});
