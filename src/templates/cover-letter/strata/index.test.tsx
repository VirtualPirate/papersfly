import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { strataTemplate } from "./index";
import { sampleCoverLetter } from "../../../data/coverLetter";
import { STRATA_VARIANTS } from "../variants";

describe("strata template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the letter", async () => {
    const Loaded = await strataTemplate.preload();
    render(<Loaded data={sampleCoverLetter} />);
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <strataTemplate.Preview data={sampleCoverLetter} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes the bespoke palette and a cobalt/modern default", () => {
    expect(strataTemplate.id).toBe("strata");
    expect(strataTemplate.variants.colors).toBe(STRATA_VARIANTS.colors);
    expect(strataTemplate.variants.default).toEqual({ colorId: "cobalt", fontId: "modern" });
  });
});
