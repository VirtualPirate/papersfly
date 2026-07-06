import { describe, it, expect } from "vitest";
import {
  FONT_LIBRARY, getFont, fontStack, fontsByCategory, FONT_CATEGORIES,
} from "./library";

describe("font library", () => {
  it("has six families with unique ids", () => {
    const ids = FONT_LIBRARY.map((f) => f.id);
    expect(ids).toEqual(["inter", "sourceSerif", "lora", "playfair", "plexSans", "plexMono"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships 400/600/700 for every family with unique file names", () => {
    const files = new Set<string>();
    for (const f of FONT_LIBRARY) {
      expect(f.weights.map((w) => w.weight).sort()).toEqual([400, 600, 700]);
      for (const w of f.weights) files.add(w.file);
    }
    expect(files.size).toBe(FONT_LIBRARY.length * 3);
  });

  it("getFont resolves by id and fontStack returns the CSS stack", () => {
    expect(getFont("lora")?.name).toBe("Lora");
    expect(getFont("nope")).toBeUndefined();
    expect(fontStack("inter")).toBe('"Inter", system-ui, sans-serif');
    expect(fontStack("nope")).toBe("inherit");
  });

  it("groups fonts by category", () => {
    expect(FONT_CATEGORIES.map((c) => c.key)).toEqual(["sans", "serif", "mono"]);
    expect(fontsByCategory("mono").map((f) => f.id)).toEqual(["plexMono"]);
    expect(fontsByCategory("sans").map((f) => f.id)).toEqual(["inter", "plexSans"]);
  });
});
