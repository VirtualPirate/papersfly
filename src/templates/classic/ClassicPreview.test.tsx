import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ClassicPreview from "./ClassicPreview";
import { sampleResume } from "@/data/resume";

describe("ClassicPreview font overrides", () => {
  it("uses the template default font when there is no override", () => {
    render(<ClassicPreview data={sampleResume} />);
    const name = screen.getByRole("heading", { name: sampleResume.name });
    expect(name.style.fontFamily).toBe("");
  });

  it("applies a name override inline", () => {
    render(<ClassicPreview data={sampleResume} fontOverrides={{ name: "lora" }} />);
    const name = screen.getByRole("heading", { name: sampleResume.name });
    expect(name).toHaveStyle({ fontFamily: '"Lora", Georgia, serif' });
  });

  it("applies an override to an experience field by item id", () => {
    render(
      <ClassicPreview
        data={sampleResume}
        fontOverrides={{ "experience.exp-1.role": "plexMono" }}
      />,
    );
    const role = screen.getByText("Staff Software Engineer");
    expect(role).toHaveStyle({ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' });
  });
});

describe("ClassicPreview variants", () => {
  it("applies the selected color + font pairing to the page root", () => {
    const { container } = render(
      <ClassicPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
    expect(page.style.getPropertyValue("--f-sans")).toBe('"Inter", system-ui, sans-serif');
  });

  it("defaults to today's navy + Source Serif look when no variant is passed", () => {
    const { container } = render(<ClassicPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("lets a per-field font override still win over the pairing", () => {
    render(
      <ClassicPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora" }}
      />,
    );
    const name = screen.getByRole("heading", { name: sampleResume.name });
    expect(name).toHaveStyle({ fontFamily: '"Lora", Georgia, serif' });
  });
});
