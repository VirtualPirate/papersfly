import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { missiveTemplate } from "./index";
import { sampleCoverLetter } from "../../../data/coverLetter";
import { MISSIVE_VARIANTS } from "../variants";

describe("missive template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the letter", async () => {
    const Loaded = await missiveTemplate.preload();
    render(<Loaded data={sampleCoverLetter} />);
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <missiveTemplate.Preview data={sampleCoverLetter} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Dear Ms. Raman,")).toBeInTheDocument();
  });

  it("exposes the bespoke palette and a forest/classic default", () => {
    expect(missiveTemplate.id).toBe("missive");
    expect(missiveTemplate.variants.colors).toBe(MISSIVE_VARIANTS.colors);
    expect(missiveTemplate.variants.default).toEqual({ colorId: "forest", fontId: "classic" });
  });
});
