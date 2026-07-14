import { describe, it, expect } from "vitest";
import { monogram, ghostInitial } from "./derive";

describe("derive", () => {
  it("monogram = first + last word initials, uppercased", () => {
    expect(monogram("Jordan Avery Chen")).toBe("JC");
    expect(monogram("cher")).toBe("C");
    expect(monogram("  ")).toBe("");
  });
  it("ghostInitial = last word initial", () => {
    expect(ghostInitial("Jordan Avery Chen")).toBe("C");
    expect(ghostInitial("")).toBe("");
  });
});
