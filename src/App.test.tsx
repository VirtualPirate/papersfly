import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "./App";
import { downloadResumePdf } from "./pdf/download";

// The PDF pipeline is browser-only (jsPDF walks a laid-out DOM); stub it so we
// can assert WHAT element the export is handed without running real generation.
vi.mock("./pdf/download", () => ({
  downloadResumePdf: vi.fn().mockResolvedValue(undefined),
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(downloadResumePdf).mockClear();
  });

  it("renders the schema-driven resume editor with a lazy-loaded live preview", async () => {
    render(<App />);
    // "Basics" is form-only; the name input value lives in the form.
    expect(screen.getByText("Basics")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jordan Avery Chen")).toBeInTheDocument();
    // The template component is in its own chunk; the preview heading appears
    // once the dynamic import resolves behind <Suspense>.
    expect(
      await screen.findByRole("heading", { name: "Jordan Avery Chen" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Experience").length).toBeGreaterThan(0);
  });

  it("shows a document-type selector defaulting to the resume", async () => {
    render(<App />);
    const select = screen.getByLabelText("Document type") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("resume");
    // Flush the lazy preview so its resolution is wrapped in act().
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
  });

  it("preloads the template so Download exports from a mounted .resume-page", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    // Preload must resolve the chunk BEFORE the capture mounts, so .resume-page
    // exists synchronously when the export reads it.
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    const captured = vi.mocked(downloadResumePdf).mock.calls[0][0];
    expect(captured).toHaveClass("resume-page");
  });
});
