import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CameoPreview from "./CameoPreview";
import { sampleCoverLetter } from "../../../data/coverLetter";

describe("CameoPreview", () => {
  it("renders the letter on a .resume-page with markers", () => {
    const { container } = render(<CameoPreview data={sampleCoverLetter} />);
    expect(container.querySelector(".resume-page.t-cameo")).not.toBeNull();
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pdf-block]").length).toBeGreaterThanOrEqual(5);
  });

  it("renders the derived monogram and hides it for a blank name", () => {
    const { container } = render(<CameoPreview data={sampleCoverLetter} />);
    expect(container.querySelector(".cam-mono")?.textContent).toBe("JC");
    const { container: blank } = render(
      <CameoPreview data={{ ...sampleCoverLetter, name: "" }} />,
    );
    expect(blank.querySelector(".cam-mono")).toBeNull();
  });

  it("hides the Re: line when subject is blank", () => {
    const { container } = render(
      <CameoPreview data={{ ...sampleCoverLetter, subject: "" }} />,
    );
    expect(container.textContent).not.toMatch(/ENG-4127|Re:/);
  });
});
