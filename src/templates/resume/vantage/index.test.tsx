import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { vantageTemplate } from "./index";
import { sampleResume } from "../../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../../theme/variants";

describe("vantage template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await vantageTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <vantageTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full catalog and a navy/modern default", () => {
    expect(vantageTemplate.id).toBe("vantage");
    expect(vantageTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(vantageTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(vantageTemplate.variants.default).toEqual({ colorId: "navy", fontId: "modern" });
  });
});
