import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MissivePreview from "./MissivePreview";
import { sampleCoverLetter } from "../../../data/coverLetter";

describe("MissivePreview", () => {
  it("renders the letter on a .resume-page with the salutation as headline", () => {
    const { container } = render(<MissivePreview data={sampleCoverLetter} />);
    expect(container.querySelector(".resume-page.t-missive")).not.toBeNull();
    expect(container.querySelector("h1.mis-salute")?.textContent).toBe("Dear Ms. Raman,");
    expect(container.querySelectorAll("[data-pdf-block]").length).toBeGreaterThanOrEqual(5);
  });

  it("hides the Re line when subject is blank", () => {
    const { container } = render(
      <MissivePreview data={{ ...sampleCoverLetter, subject: "" }} />,
    );
    expect(container.textContent).not.toMatch(/ENG-4127|Re:/i);
  });

  it("renders all three paragraphs in order", () => {
    render(<MissivePreview data={sampleCoverLetter} />);
    expect(screen.getByText(/Northwind Labs I led the re-architecture/)).toBeInTheDocument();
  });
});
