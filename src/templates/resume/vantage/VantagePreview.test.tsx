import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VantagePreview from "./VantagePreview";
import { sampleResume } from "@/data/resume";

describe("VantagePreview", () => {
  it("renders the page root, both columns, and the name", () => {
    const { container } = render(<VantagePreview data={sampleResume} />);
    expect(container.querySelector(".resume-page.t-vantage")).not.toBeNull();
    expect(container.querySelector(".vt-main")).not.toBeNull();
    expect(container.querySelector(".vt-aside")).not.toBeNull();
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("applies the selected variant to the page root", () => {
    const { container } = render(
      <VantagePreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("falls back to the theme DEFAULT_VARIANT (navy + Source Serif) when no variant prop is passed", () => {
    // The component prop default is the global DEFAULT_VARIANT; the template's own
    // navy+modern default (see index.test.tsx) is applied by the app, not here.
    const { container } = render(<VantagePreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("labels contact rows and hides empty ones", () => {
    const data = {
      ...sampleResume,
      contact: { ...sampleResume.contact, website: "", linkedin: "" },
    };
    render(<VantagePreview data={data} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.queryByText("Website")).not.toBeInTheDocument();
    expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
  });

  it("applies a per-field font override inline, winning over the pairing", () => {
    render(
      <VantagePreview
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
