import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs and has jest-dom matchers", () => {
    expect(1 + 1).toBe(2);
    expect(typeof globalThis.ResizeObserver).toBe("function");
  });
});
