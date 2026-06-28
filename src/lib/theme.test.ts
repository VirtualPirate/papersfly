import { describe, it, expect, afterEach } from "vitest";
import { resolveInitialTheme, toggleTheme, applyTheme, THEME_KEY } from "./theme";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

describe("resolveInitialTheme", () => {
  it("uses a valid stored value over the system preference", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });
  it("falls back to the system preference when nothing valid is stored", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
    expect(resolveInitialTheme("nonsense", true)).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("adds or removes the dark class on the document root", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("toggleTheme", () => {
  it("flips the theme, persists it, and returns the new value", () => {
    expect(toggleTheme()).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(toggleTheme()).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });
});
