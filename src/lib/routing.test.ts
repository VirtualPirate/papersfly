import { describe, it, expect } from "vitest";
import { builderHref, buildBuilderPaths } from "./routing";

describe("builderHref", () => {
  it("builds the builder URL from a doc id and template id", () => {
    expect(builderHref("resume", "classic")).toBe("/build/resume/classic");
  });
});

describe("buildBuilderPaths", () => {
  it("emits one entry per template of each document, in order", () => {
    const docs = [
      { id: "resume", templates: [{ id: "classic" }, { id: "modern" }] },
      { id: "invoice", templates: [{ id: "plain" }] },
    ] as never;
    expect(buildBuilderPaths(docs)).toEqual([
      { doc: "resume", template: "classic" },
      { doc: "resume", template: "modern" },
      { doc: "invoice", template: "plain" },
    ]);
  });
});
