import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "../../forms/SchemaForm";
import { resumeSchema, makeBlankExperience, makeBlankSkill } from "./schema";
import { sampleResume } from "../../data/resume";

/** Open every accordion section so all labels are in the DOM. */
function expandAll() {
  for (const name of ["Summary", "Experience", "Education", "Skills"]) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
}

describe("resumeSchema", () => {
  it("renders all sections and the key field labels", () => {
    render(<SchemaForm schema={resumeSchema} data={sampleResume} onChange={() => {}} />);
    for (const heading of ["Basics", "Summary", "Experience", "Education", "Skills"]) {
      expect(screen.getByRole("button", { name: heading })).toBeInTheDocument();
    }
    expandAll();
    for (const label of [
      "Full name", "Headline", "Email", "Phone", "Website", "LinkedIn",
      "Professional summary", "Role", "Company", "Bullets (one per line)",
      "Institution", "Degree", "Detail", "Category", "Items (comma-separated)",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("renders one card (Remove button) per experience, education and skill entry", () => {
    render(<SchemaForm schema={resumeSchema} data={sampleResume} onChange={() => {}} />);
    expandAll();
    const expected =
      sampleResume.experience.length + sampleResume.education.length + sampleResume.skills.length;
    expect(screen.getAllByRole("button", { name: /^Remove / }).length).toBe(expected);
  });

  it("blank-item factories match the original add-button defaults", () => {
    expect(makeBlankExperience()).toEqual({
      role: "Job Title", company: "Company", location: "",
      start: "20XX", end: "Present",
      bullets: ["Describe an accomplishment with measurable impact."],
    });
    expect(makeBlankSkill()).toEqual({ label: "Category", items: [] });
  });
});
