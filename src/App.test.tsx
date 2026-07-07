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
    render(<App docId="resume" templateId="classic" />);
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

  it("shows a back link to the gallery and the active document · template", async () => {
    render(<App docId="resume" templateId="classic" />);
    const back = screen.getByRole("link", { name: /templates/i });
    expect(back).toHaveAttribute("href", "/create");
    const title = screen.getByTestId("builder-title");
    expect(title).toHaveTextContent("Résumé");
    expect(title).toHaveTextContent("Classic");
    // No document-type dropdown anymore.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    // Flush the lazy preview so its resolution is wrapped in act().
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
  });

  it("surfaces a dismissable error alert when PDF generation fails", async () => {
    vi.mocked(downloadResumePdf).mockRejectedValueOnce(new Error("boom"));
    render(<App docId="resume" templateId="classic" />);
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("PDF error");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.queryByText("PDF error")).not.toBeInTheDocument(),
    );
  });

  it("preloads the template so Download exports from a mounted .resume-page", async () => {
    render(<App docId="resume" templateId="classic" />);
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    // Preload must resolve the chunk BEFORE the capture mounts, so .resume-page
    // exists synchronously when the export reads it.
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    const captured = vi.mocked(downloadResumePdf).mock.calls[0][0];
    expect(captured).toHaveClass("resume-page");
  });

  it("applies a per-field font override to the live preview", async () => {
    render(<App docId="resume" templateId="classic" />);
    const name = await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    expect(name.style.fontFamily).toBe("");

    const picker = document.querySelector('[data-path="name"]') as HTMLElement;
    fireEvent.keyDown(picker, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Lora" }), { key: "Enter" });

    expect(name).toHaveStyle({ fontFamily: '"Lora", Georgia, serif' });
  });

  it("passes the chosen overrides to the PDF export", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const picker = document.querySelector('[data-path="name"]') as HTMLElement;
    fireEvent.keyDown(picker, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Lora" }), { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    expect(vi.mocked(downloadResumePdf).mock.calls[0][2]).toEqual({ name: "lora" });
  });

  it("applies a color + font variant to the live preview from the Style popover", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const page = document.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");

    // Open the Style popover, then pick a scheme + pairing — the preview updates
    // live while the popover stays open (it's non-modal, no apply step).
    fireEvent.click(screen.getByRole("button", { name: /variants/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Burgundy" }));
    fireEvent.click(screen.getByRole("button", { name: "Editorial" }));

    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("resets the variant to the template default", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const page = document.querySelector(".resume-page") as HTMLElement;

    fireEvent.click(screen.getByRole("button", { name: /variants/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Forest" }));
    expect(page.style.getPropertyValue("--c-accent")).toBe("#285043");

    // The popover is non-modal, so Reset stays clickable behind it.
    fireEvent.click(screen.getByRole("button", { name: /reset sample/i }));
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
  });

  it("passes the variant's fonts to the PDF export", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });

    fireEvent.click(screen.getByRole("button", { name: /variants/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Mono" }));

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    expect(new Set(vi.mocked(downloadResumePdf).mock.calls[0][3])).toEqual(
      new Set(["plexMono", "inter"]),
    );
  });
});
