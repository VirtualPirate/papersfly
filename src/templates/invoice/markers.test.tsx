import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { sampleInvoice } from "@/data/invoice";
import NordicPreview from "./nordic/NordicPreview";
import PrismPreview from "./prism/PrismPreview";
import BureauPreview from "./bureau/BureauPreview";
import SterlingPreview from "./sterling/SterlingPreview";

const items = sampleInvoice.items.length; // 4 in the sample

// Every invoice template marks each line-item row plus its closing blocks
// (totals + footer) as a keep-together [data-pdf-block]; none uses a heading.
// `rowSel` isolates the line-item rows so we assert every row is marked, and
// `blocks` is the full expected count (rows + the template's closing blocks).
describe("invoice pdf page-break markers", () => {
  it.each([
    ["nordic", NordicPreview, ".nd-row[data-pdf-block]", items + 3], // + nd-totals, nd-balance-wrap, nd-foot
    ["prism", PrismPreview, ".pr-row[data-pdf-block]", items + 3], // + pr-tot, pr-chip, pr-foot
    ["bureau", BureauPreview, "tbody tr[data-pdf-block]", items + 2], // + bu-foot, bu-notes
    ["sterling", SterlingPreview, "tbody tr[data-pdf-block]", items + 2], // + st-totals, st-foot
  ] as const)("%s marks every line-item row and its closing blocks", (_name, Preview, rowSel, blocks) => {
    const { container } = render(<Preview data={sampleInvoice} />);
    expect(container.querySelectorAll(rowSel).length).toBe(items);
    expect(container.querySelectorAll("[data-pdf-block]").length).toBe(blocks);
    expect(container.querySelectorAll("[data-pdf-heading]").length).toBe(0);
  });
});
