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
