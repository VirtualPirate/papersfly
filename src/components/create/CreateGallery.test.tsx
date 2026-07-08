import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateGallery } from "./CreateGallery";
import { classicTemplate } from "@/templates/resume/classic";
import { sampleResume } from "@/data/resume";

// Two fake docs so we can assert doc-type switching swaps the cards.
const fakeDocs = [
  { id: "resume", name: "Résumé", schema: {}, defaultData: sampleResume, templates: [classicTemplate] },
  { id: "letter", name: "Cover letter", schema: {}, defaultData: sampleResume, templates: [{ ...classicTemplate, id: "formal", name: "Formal" }] },
] as never;

describe("CreateGallery", () => {
  it("shows a pill per document and the selected document's template cards", async () => {
    render(<CreateGallery documents={fakeDocs} />);
    expect(screen.getByRole("button", { name: "Résumé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cover letter" })).toBeInTheDocument();
    // Default selection = first doc → its Classic card links to the builder.
    const card = screen.getByRole("link", { name: /classic/i });
    expect(card).toHaveAttribute("href", "/build/resume/classic");
  });

  it("swaps the cards when a different document type is selected", () => {
    render(<CreateGallery documents={fakeDocs} />);
    fireEvent.click(screen.getByRole("button", { name: "Cover letter" }));
    const card = screen.getByRole("link", { name: /formal/i });
    expect(card).toHaveAttribute("href", "/build/letter/formal");
  });
});
