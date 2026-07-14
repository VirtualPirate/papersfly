import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { carbonTemplate } from "./index";
import { sampleCoverLetter } from "../../../data/coverLetter";
import { CARBON_VARIANTS } from "../variants";

describe("carbon template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the letter", async () => {
    const Loaded = await carbonTemplate.preload();
    render(<Loaded data={sampleCoverLetter} />);
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <carbonTemplate.Preview data={sampleCoverLetter} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes the bespoke palette and a red/mono default", () => {
    expect(carbonTemplate.id).toBe("carbon");
    expect(carbonTemplate.variants.colors).toBe(CARBON_VARIANTS.colors);
    expect(carbonTemplate.variants.default).toEqual({ colorId: "red", fontId: "mono" });
  });
});
