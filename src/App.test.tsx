import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the schema-driven resume editor", () => {
    render(<App />);
    // "Basics" is only in the form; "Experience" appears in both form and preview
    expect(screen.getByText("Basics")).toBeInTheDocument();
    expect(screen.getAllByText("Experience").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("shows a document-type selector defaulting to the resume", () => {
    render(<App />);
    const select = screen.getByLabelText("Document type") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("resume");
  });
});
