import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { cameoTemplate } from "./index";
import { sampleCoverLetter } from "../../../data/coverLetter";
import { CAMEO_VARIANTS } from "../variants";

describe("cameo template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the letter", async () => {
    const Loaded = await cameoTemplate.preload();
    render(<Loaded data={sampleCoverLetter} />);
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <cameoTemplate.Preview data={sampleCoverLetter} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes the bespoke palette and a burgundy/editorial default", () => {
    expect(cameoTemplate.id).toBe("cameo");
    expect(cameoTemplate.variants.colors).toBe(CAMEO_VARIANTS.colors);
    expect(cameoTemplate.variants.default).toEqual({ colorId: "burgundy", fontId: "editorial" });
  });
});
