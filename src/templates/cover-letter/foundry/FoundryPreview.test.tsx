import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FoundryPreview from "./FoundryPreview";
import { sampleCoverLetter } from "../../../data/coverLetter";

describe("FoundryPreview", () => {
  it("renders the letter on a .resume-page with markers", () => {
    const { container } = render(<FoundryPreview data={sampleCoverLetter} />);
    expect(container.querySelector(".resume-page.t-foundry")).not.toBeNull();
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pdf-block]").length).toBeGreaterThanOrEqual(5);
  });

  it("renders the ghost initial and hides it for a blank name", () => {
    const { container } = render(<FoundryPreview data={sampleCoverLetter} />);
    expect(container.querySelector(".fdy-ghost")?.textContent).toBe("C");
    const { container: blank } = render(
      <FoundryPreview data={{ ...sampleCoverLetter, name: "" }} />,
    );
    expect(blank.querySelector(".fdy-ghost")).toBeNull();
  });

  it("hides the Re meta row when subject is blank", () => {
    const { container } = render(
      <FoundryPreview data={{ ...sampleCoverLetter, subject: "" }} />,
    );
    expect(container.textContent).not.toMatch(/ENG-4127/);
  });
});
