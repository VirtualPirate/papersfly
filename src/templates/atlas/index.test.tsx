import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { atlasTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("atlas template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await atlasTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <atlasTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full catalog and a navy/modern default", () => {
    expect(atlasTemplate.id).toBe("atlas");
    expect(atlasTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(atlasTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(atlasTemplate.variants.default).toEqual({ colorId: "navy", fontId: "modern" });
  });
});
