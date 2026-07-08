import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { prismTemplate } from "./index";
import { sampleInvoice } from "../../../data/invoice";
import { PRISM_VARIANTS } from "../variants";

describe("prism template (lazy-loaded)", () => {
  it("preload() resolves to a component that renders the invoice", async () => {
    const Loaded = await prismTemplate.preload();
    render(<Loaded data={sampleInvoice} />);
    expect(screen.getByText("$13,048.43")).toBeInTheDocument();
  });
  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="loading" />}>
        <prismTemplate.Preview data={sampleInvoice} />
      </Suspense>,
    );
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(await screen.findByText("$13,048.43")).toBeInTheDocument();
  });
  it("uses the Prism variants", () => {
    expect(prismTemplate.variants).toBe(PRISM_VARIANTS);
  });
});
