import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateCard } from "./TemplateCard";
import { classicTemplate } from "@/templates/resume/classic";
import { sampleResume } from "@/data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS, type Variant } from "@/theme/variants";

describe("TemplateCard", () => {
  it("links to the builder for its doc + template and shows the name", async () => {
    render(<TemplateCard docId="resume" template={classicTemplate} data={sampleResume} />);
    const link = screen.getByRole("link", { name: /classic/i });
    expect(link).toHaveAttribute("href", "/build/resume/classic");
    expect(screen.getByText("Classic")).toBeInTheDocument();
    // The lazy preview resolves and renders the sample resume inside the card.
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("renders the thumbnail in the template's default variant", () => {
    const seen: (Variant | undefined)[] = [];
    const dflt: Variant = { colorId: "forest", fontId: "editorial" };
    const fake = {
      id: "fake",
      name: "Fake",
      description: "desc",
      schema: [],
      variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: dflt },
      Preview: (p: { variant?: Variant }) => {
        seen.push(p.variant);
        return <div className="resume-page" data-color={p.variant?.colorId} />;
      },
      preload: async () => fake.Preview,
    };
    render(<TemplateCard docId="resume" template={fake as never} data={{}} />);
    expect(seen[0]).toEqual(dflt);
  });
});
