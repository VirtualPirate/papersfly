import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { sampleResume } from "@/data/resume";
import ClassicPreview from "./classic/ClassicPreview";
import LedgerPreview from "./ledger/LedgerPreview";
import MeridianPreview from "./meridian/MeridianPreview";
import QuillPreview from "./quill/QuillPreview";
import AtlasPreview from "./atlas/AtlasPreview";
import VantagePreview from "./vantage/VantagePreview";

const expectedBlocks =
  sampleResume.experience.length +
  sampleResume.education.length +
  sampleResume.skills.length +
  1; // + the summary paragraph

describe("pdf page-break markers", () => {
  it.each([
    ["classic", ClassicPreview],
    ["ledger", LedgerPreview],
    ["meridian", MeridianPreview],
    ["quill", QuillPreview],
  ] as const)("%s marks headings and keep-together blocks", (_name, Preview) => {
    const { container } = render(<Preview data={sampleResume} />);
    expect(container.querySelectorAll("[data-pdf-heading]").length).toBe(4);
    expect(container.querySelectorAll("[data-pdf-block]").length).toBe(expectedBlocks);
  });

  it.each([
    ["Atlas", AtlasPreview],
    ["Vantage", VantagePreview],
  ] as const)("does not mark %s (two-column, excluded from the pre-pass)", (_name, Preview) => {
    const { container } = render(<Preview data={sampleResume} />);
    expect(container.querySelectorAll("[data-pdf-heading]").length).toBe(0);
    expect(container.querySelectorAll("[data-pdf-block]").length).toBe(0);
  });
});
