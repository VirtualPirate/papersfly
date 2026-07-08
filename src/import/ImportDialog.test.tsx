import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImportDialog } from "./ImportDialog";
import { resumeDocument } from "../documents/resume/index";
import { sampleResume } from "../data/resume";
import { stripIds } from "./spec";

const validJson = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ ...(stripIds(sampleResume) as object), ...over });

function open(props: Partial<React.ComponentProps<typeof ImportDialog>> = {}) {
  const onImport = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ImportDialog
      open
      onOpenChange={onOpenChange}
      doc={resumeDocument}
      currentData={sampleResume}
      onImport={onImport}
      {...props}
    />,
  );
  return { onImport, onOpenChange };
}

const goToPaste = () => fireEvent.click(screen.getByRole("button", { name: /next: paste json/i }));
const pasteBox = () => screen.getByRole("textbox", { name: /pasted json/i });

describe("ImportDialog", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("step 1 shows the prompt and a copy button", () => {
    open();
    expect(screen.getByRole("heading", { name: /import from ai/i })).toBeInTheDocument();
    const promptBox = screen.getByLabelText("Prompt") as HTMLTextAreaElement;
    expect(promptBox.value).toContain("data extractor");
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("shows a summary and enables Import for valid JSON", () => {
    open();
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: validJson() } });
    expect(screen.getByText(/3 roles · 1 school · 3 skill groups/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import & replace/i })).not.toBeDisabled();
  });

  it("shows path errors and disables Import for invalid JSON", () => {
    open();
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: '{"name":"A","objective":"x"}' } });
    expect(screen.getByText("contact")).toBeInTheDocument(); // a missing-key path
    expect(screen.getByText("objective")).toBeInTheDocument(); // unknown-key path
    expect(screen.getByRole("button", { name: /import & replace/i })).toBeDisabled();
  });

  it("imports immediately when data is unedited", () => {
    const { onImport } = open({ currentData: sampleResume });
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: validJson({ name: "Imported One" }) } });
    fireEvent.click(screen.getByRole("button", { name: /import & replace/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const [next, summary] = onImport.mock.calls[0];
    expect(next.name).toBe("Imported One");
    expect(typeof next.experience[0].id).toBe("string");
    expect(summary).toBe("3 roles · 1 school · 3 skill groups");
  });

  it("confirms before replacing edited data", () => {
    const { onImport } = open({ currentData: { ...sampleResume, name: "Edited" } });
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: validJson() } });
    fireEvent.click(screen.getByRole("button", { name: /import & replace/i }));
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText(/replace current/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^replace$/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});
