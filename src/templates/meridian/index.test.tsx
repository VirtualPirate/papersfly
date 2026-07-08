import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { meridianTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("meridian template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await meridianTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <meridianTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full color + font catalog and a navy/classic default", () => {
    expect(meridianTemplate.id).toBe("meridian");
    expect(meridianTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(meridianTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(meridianTemplate.variants.default).toEqual({ colorId: "navy", fontId: "classic" });
  });
});
