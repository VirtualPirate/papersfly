import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { foundryTemplate } from "./index";
import { sampleCoverLetter } from "../../../data/coverLetter";
import { FOUNDRY_VARIANTS } from "../variants";

describe("foundry template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the letter", async () => {
    const Loaded = await foundryTemplate.preload();
    render(<Loaded data={sampleCoverLetter} />);
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <foundryTemplate.Preview data={sampleCoverLetter} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes the bespoke palette and a navy/classic default", () => {
    expect(foundryTemplate.id).toBe("foundry");
    expect(foundryTemplate.variants.colors).toBe(FOUNDRY_VARIANTS.colors);
    expect(foundryTemplate.variants.default).toEqual({ colorId: "navy", fontId: "classic" });
  });
});
