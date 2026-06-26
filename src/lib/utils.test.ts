import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy classes and drops falsy ones", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("merges conflicting tailwind utilities so the last one wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
