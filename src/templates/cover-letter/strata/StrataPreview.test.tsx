import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StrataPreview from "./StrataPreview";
import { sampleCoverLetter } from "../../../data/coverLetter";

describe("StrataPreview", () => {
  it("renders the letter on a .resume-page with markers", () => {
    const { container } = render(<StrataPreview data={sampleCoverLetter} />);
    expect(container.querySelector(".resume-page.t-strata")).not.toBeNull();
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pdf-block]").length).toBeGreaterThanOrEqual(5);
  });

  it("drops the Re cell and reshapes the grid when subject is blank", () => {
    const { container } = render(
      <StrataPreview data={{ ...sampleCoverLetter, subject: "" }} />,
    );
    expect(container.textContent).not.toMatch(/ENG-4127/);
    expect(container.querySelector(".str-matter--nore")).not.toBeNull();
  });
});
