import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { classicTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT } from "../../theme/variants";

describe("classic template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await classicTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview: fallback shows first, resume appears once the chunk loads", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <classicTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    // The component lives in its own chunk, so it is NOT present on first paint —
    // the Suspense fallback renders instead.
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Avery Chen")).not.toBeInTheDocument();
    // Once the dynamic import resolves, the live preview renders.
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });
});

describe("classic template variants", () => {
  it("exposes the shared color + font catalog and the default selection", () => {
    expect(classicTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(classicTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(classicTemplate.variants.default).toEqual(DEFAULT_VARIANT);
  });
});
