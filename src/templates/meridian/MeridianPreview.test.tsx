import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MeridianPreview from "./MeridianPreview";
import { sampleResume } from "@/data/resume";

describe("MeridianPreview", () => {
  it("renders the page root and the name", () => {
    const { container } = render(<MeridianPreview data={sampleResume} />);
    expect(container.querySelector(".resume-page.meridian")).not.toBeNull();
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("applies the selected variant to the page root", () => {
    const { container } = render(
      <MeridianPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("defaults to navy + Source Serif when no variant is passed", () => {
    const { container } = render(<MeridianPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("applies a per-field font override inline, winning over the pairing", () => {
    render(
      <MeridianPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora", "experience.exp-1.role": "plexMono" }}
      />,
    );
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toHaveStyle({
      fontFamily: '"Lora", Georgia, serif',
    });
    expect(screen.getByText("Staff Software Engineer")).toHaveStyle({
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    });
  });
});
