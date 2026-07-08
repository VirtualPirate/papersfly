import { describe, it, expect } from "vitest";
import { themeCssVars } from "./theme";

describe("themeCssVars", () => {
  it("returns today's defaults when called with no overrides", () => {
    const v = themeCssVars();
    expect(v["--c-accent"]).toBe("#1f3a5f");
    expect(v["--f-sans"]).toBe('"Inter", system-ui, sans-serif');
    expect(v["--f-serif"]).toBe('"SourceSerif", Georgia, serif');
  });

  it("merges variant overrides over the accent and font vars", () => {
    const v = themeCssVars({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"IBM Plex Sans", system-ui, sans-serif',
    });
    expect(v["--c-accent"]).toBe("#7c2d3a");
    expect(v["--f-serif"]).toBe('"Playfair Display", Georgia, serif');
    expect(v["--f-sans"]).toBe('"IBM Plex Sans", system-ui, sans-serif');
    // Untouched vars still come from the theme.
    expect(v["--c-ink"]).toBe("#1b1b1f");
  });

  it("derives a light --c-accent-soft tint from the accent", () => {
    expect(themeCssVars()["--c-accent-soft"]).toBe("#edeff2");
    expect(themeCssVars({ accent: "#7c2d3a" })["--c-accent-soft"]).toBe("#f5eeef");
  });

  it("emits a default section-spacing scale of 1, overridable via sectionScale", () => {
    expect(themeCssVars()["--sp-section-scale"]).toBe("1");
    expect(themeCssVars({ sectionScale: 0.5 })["--sp-section-scale"]).toBe("0.5");
    expect(themeCssVars({ sectionScale: 1.75 })["--sp-section-scale"]).toBe("1.75");
  });

  it("emits a default font scale of 1, overridable via fontScale", () => {
    expect(themeCssVars()["--s-font-scale"]).toBe("1");
    expect(themeCssVars({ fontScale: 0.9 })["--s-font-scale"]).toBe("0.9");
    expect(themeCssVars({ fontScale: 1.1 })["--s-font-scale"]).toBe("1.1");
  });

  it("makes size + leading tokens scale-aware via calc()", () => {
    const v = themeCssVars();
    expect(v["--s-body"]).toBe("calc(9.5pt * var(--s-font-scale))");
    expect(v["--s-name"]).toBe("calc(25pt * var(--s-font-scale))");
    expect(v["--lh-body"]).toBe("calc(12.4pt * var(--s-font-scale))");
  });
});
