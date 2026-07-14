import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreateGallery } from "./CreateGallery";
import { classicTemplate } from "@/templates/resume/classic";
import { sampleResume } from "@/data/resume";

// Two fake docs so we can assert the active document drives which cards show.
const fakeDocs = [
  { id: "resume", name: "Resume", schema: {}, defaultData: sampleResume, templates: [classicTemplate] },
  { id: "letter", name: "Cover letter", schema: {}, defaultData: sampleResume, templates: [{ ...classicTemplate, id: "formal", name: "Formal" }] },
] as never;

describe("CreateGallery", () => {
  it("renders a cross-link pill per document and the active document's cards", () => {
    render(<CreateGallery documents={fakeDocs} />);
    // Pills are real links to each doc's picker route (SEO cross-linking).
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/create-resume");
    expect(screen.getByRole("link", { name: "Cover letter" })).toHaveAttribute("href", "/create-letter");
    // No activeDocId → first doc is active → its Classic card links to the builder.
    const card = screen.getByRole("link", { name: /classic/i });
    expect(card).toHaveAttribute("href", "/build/resume/classic");
  });

  it("shows the cards for the document named by activeDocId", () => {
    render(<CreateGallery documents={fakeDocs} activeDocId="letter" />);
    const card = screen.getByRole("link", { name: /formal/i });
    expect(card).toHaveAttribute("href", "/build/letter/formal");
    // The active pill marks itself as the current page.
    expect(screen.getByRole("link", { name: "Cover letter" })).toHaveAttribute("aria-current", "page");
  });
});
