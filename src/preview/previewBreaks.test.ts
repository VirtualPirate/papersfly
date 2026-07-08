import { describe, it, expect } from "vitest";
import { insertPreviewBreaks } from "./previewBreaks";
import type { PageMetrics } from "../pdf/paginate";

// usableBand = pageH - mt - mb = 900; mirrors paginate.test.ts's fixture.
const M: PageMetrics = { pageH: 1000, mt: 50, mb: 50 };

/** A full DOMRect so assigning to `el.getBoundingClientRect` type-checks. */
function domRect(top: number, bottom: number): DOMRect {
  return {
    x: 0, y: top, top, bottom, left: 0, right: 0,
    width: 0, height: bottom - top, toJSON: () => ({}),
  };
}

function marked(tag: string, attr: string, top: number, bottom: number): HTMLElement {
  const el = document.createElement(tag);
  el.setAttribute(attr, "");
  el.getBoundingClientRect = () => domRect(top, bottom);
  return el;
}

/** Build a root at y=0 holding the given marked children (document order). */
function rootWith(children: HTMLElement[]): HTMLElement {
  const root = document.createElement("div");
  root.getBoundingClientRect = () => domRect(0, 0);
  for (const c of children) root.appendChild(c);
  document.body.appendChild(root);
  return root;
}

describe("insertPreviewBreaks", () => {
  it("inserts nothing (and a no-op cleanup) when there are no marked units", () => {
    const root = rootWith([]);
    const cleanup = insertPreviewBreaks(root, M, 1);
    expect(root.querySelectorAll("[data-preview-break]").length).toBe(0);
    expect(() => cleanup()).not.toThrow();
    root.remove();
  });

  it("inserts nothing when the single unit fits within its page band", () => {
    const heading = marked("h2", "data-pdf-heading", 100, 120);
    const block = marked("div", "data-pdf-block", 130, 300);
    const root = rootWith([heading, block]);
    const cleanup = insertPreviewBreaks(root, M, 1);
    expect(root.querySelectorAll("[data-preview-break]").length).toBe(0);
    cleanup();
    root.remove();
  });

  it("inserts a divider before a straddling heading+block and removes it on cleanup", () => {
    const heading = marked("h2", "data-pdf-heading", 880, 900);
    const block = marked("div", "data-pdf-block", 905, 1100);
    const root = rootWith([heading, block]);
    // unit 880..1100, page 0, bottomLimit 950, 1100 > 950 -> target 1050,
    // gap = 1050 - 880 = 170, inserted before the heading; line at 170 - 50 = 120.
    const cleanup = insertPreviewBreaks(root, M, 1);
    const breaks = root.querySelectorAll<HTMLElement>("[data-preview-break]");
    expect(breaks.length).toBe(1);
    expect(breaks[0].style.height).toBe("170px");
    expect(breaks[0].nextElementSibling).toBe(heading);
    const line = breaks[0].querySelector<HTMLElement>(".page-break-line")!;
    expect(line.style.top).toBe("120px");
    expect(breaks[0].querySelector(".page-break-label")!.textContent).toBe("Page 2");

    cleanup();
    expect(root.querySelectorAll("[data-preview-break]").length).toBe(0);
    root.remove();
  });

  it("labels consecutive straddles Page 2 then Page 3", () => {
    // Two standalone blocks; each on its own straddles a boundary after shift.
    const b0 = marked("div", "data-pdf-block", 900, 1100); // spacer 150 -> shift 150
    const b1 = marked("div", "data-pdf-block", 1800, 2000); // shifted 1950 straddles page 1
    const root = rootWith([b0, b1]);
    const cleanup = insertPreviewBreaks(root, M, 1);
    const labels = [...root.querySelectorAll(".page-break-label")].map((n) => n.textContent);
    expect(labels).toEqual(["Page 2", "Page 3"]);
    cleanup();
    root.remove();
  });

  it("inserts a <tr> divider (not a <div>) before a straddling table row", () => {
    // Table rows can't take a <div> sibling; the divider host must be a <tr>
    // carrying a full-width cell whose .page-break div holds the line + label.
    const table = document.createElement("table");
    const tbody = document.createElement("tbody");
    const row = marked("tr", "data-pdf-block", 900, 1100); // straddles page 0
    tbody.appendChild(row);
    table.appendChild(tbody);
    const root = document.createElement("div");
    root.getBoundingClientRect = () => domRect(0, 0);
    root.appendChild(table);
    document.body.appendChild(root);

    const cleanup = insertPreviewBreaks(root, M, 1);
    const brk = root.querySelector<HTMLElement>("[data-preview-break]")!;
    expect(brk.tagName).toBe("TR");
    expect(brk.nextElementSibling).toBe(row);
    const box = brk.querySelector<HTMLElement>(".page-break")!;
    expect(box.style.height).toBe("150px"); // target 1050 - top 900
    const line = brk.querySelector<HTMLElement>(".page-break-line")!;
    expect(line.style.top).toBe("100px"); // height 150 - mt 50
    expect(brk.querySelector(".page-break-label")!.textContent).toBe("Page 2");

    cleanup();
    expect(root.querySelectorAll("[data-preview-break]").length).toBe(0);
    root.remove();
  });

  it("compensates for the display scale when measuring", () => {
    // Same geometry as the straddle case but rects are pre-scaled by 0.5;
    // dividing by scale recovers the true px, so the break is identical.
    const heading = marked("h2", "data-pdf-heading", 440, 450);   // 880,900 * 0.5
    const block = marked("div", "data-pdf-block", 452.5, 550);    // 905,1100 * 0.5
    const root = rootWith([heading, block]);
    const cleanup = insertPreviewBreaks(root, M, 0.5);
    const breaks = root.querySelectorAll<HTMLElement>("[data-preview-break]");
    expect(breaks.length).toBe(1);
    expect(breaks[0].style.height).toBe("170px"); // true-px gap, unaffected by scale
    cleanup();
    root.remove();
  });
});
