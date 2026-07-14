import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CarbonPreview from "./CarbonPreview";
import { sampleCoverLetter } from "../../../data/coverLetter";

describe("CarbonPreview", () => {
  it("renders the letter on a .resume-page with markers", () => {
    const { container } = render(<CarbonPreview data={sampleCoverLetter} />);
    expect(container.querySelector(".resume-page.t-carbon")).not.toBeNull();
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pdf-block]").length).toBeGreaterThanOrEqual(5);
  });

  it("hides the Re routing row when subject is blank", () => {
    const { container } = render(
      <CarbonPreview data={{ ...sampleCoverLetter, subject: "" }} />,
    );
    expect(container.textContent).not.toMatch(/ENG-4127/);
    expect(container.querySelectorAll(".car-row").length).toBe(3); // To / At / Date
  });

  it("joins non-empty contact fields in the footer", () => {
    const { container } = render(
      <CarbonPreview data={{ ...sampleCoverLetter, contact: { ...sampleCoverLetter.contact, phone: "" } }} />,
    );
    const foot = container.querySelector(".car-foot")?.textContent ?? "";
    expect(foot).toContain("jordan.chen@example.com");
    expect(foot).not.toContain("555-0148");
  });
});
