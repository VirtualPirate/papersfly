import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateCard } from "./TemplateCard";
import { classicTemplate } from "@/templates/classic";
import { sampleResume } from "@/data/resume";

describe("TemplateCard", () => {
  it("links to the builder for its doc + template and shows the name", async () => {
    render(<TemplateCard docId="resume" template={classicTemplate} data={sampleResume} />);
    const link = screen.getByRole("link", { name: /classic/i });
    expect(link).toHaveAttribute("href", "/build/resume/classic");
    expect(screen.getByText("Classic")).toBeInTheDocument();
    // The lazy preview resolves and renders the sample resume inside the card.
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });
});
