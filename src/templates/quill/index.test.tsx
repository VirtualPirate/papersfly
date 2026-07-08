import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { quillTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("quill template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await quillTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <quillTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full catalog and a charcoal/editorial default", () => {
    expect(quillTemplate.id).toBe("quill");
    expect(quillTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(quillTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(quillTemplate.variants.default).toEqual({ colorId: "charcoal", fontId: "editorial" });
  });
});
