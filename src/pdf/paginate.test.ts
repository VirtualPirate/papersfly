import { describe, it, expect } from "vitest";
import {
  buildUnits,
  computeSpacers,
  type FlowNode,
  type UnitRect,
  type PageMetrics,
} from "./paginate";

// Round numbers keep the arithmetic obvious: usableBand = pageH - mt - mb = 900.
const M: PageMetrics = { pageH: 1000, mt: 50, mb: 50 };

describe("buildUnits", () => {
  it("glues a heading to the single block that follows it", () => {
    const nodes: FlowNode[] = [
      { kind: "heading", top: 100, bottom: 120, elIndex: 0 },
      { kind: "block", top: 130, bottom: 300, elIndex: 1 },
    ];
    expect(buildUnits(nodes)).toEqual([{ top: 100, bottom: 300, index: 0 }]);
  });

  it("glues a heading to only its FIRST block; later blocks stand alone", () => {
    const nodes: FlowNode[] = [
      { kind: "heading", top: 0, bottom: 20, elIndex: 0 },
      { kind: "block", top: 25, bottom: 100, elIndex: 1 },
      { kind: "block", top: 110, bottom: 200, elIndex: 2 },
      { kind: "block", top: 210, bottom: 300, elIndex: 3 },
    ];
    expect(buildUnits(nodes)).toEqual([
      { top: 0, bottom: 100, index: 0 },
      { top: 110, bottom: 200, index: 2 },
      { top: 210, bottom: 300, index: 3 },
    ]);
  });

  it("treats a block with no preceding heading as its own unit", () => {
    const nodes: FlowNode[] = [{ kind: "block", top: 40, bottom: 90, elIndex: 0 }];
    expect(buildUnits(nodes)).toEqual([{ top: 40, bottom: 90, index: 0 }]);
  });
});

describe("computeSpacers", () => {
  it("returns no spacers when every unit fits within its page band", () => {
    const units: UnitRect[] = [
      { top: 100, bottom: 300, index: 0 },
      { top: 320, bottom: 900, index: 1 }, // bottom 900 <= bottomLimit 950
    ];
    expect(computeSpacers(units, M)).toEqual([]);
  });

  it("does not push a unit that ends within EPS of the bottom limit", () => {
    const units: UnitRect[] = [{ top: 400, bottom: 950, index: 0 }]; // == bottomLimit
    expect(computeSpacers(units, M)).toEqual([]);
  });

  it("pushes a straddling unit to the next page top + top margin", () => {
    const units: UnitRect[] = [{ top: 900, bottom: 1100, index: 0 }];
    // page 0, bottomLimit 950, bottom 1100 > 950, height 200 <= 900
    // target = 1*1000 + 50 = 1050; gap = 1050 - 900 = 150
    expect(computeSpacers(units, M)).toEqual([{ index: 0, height: 150 }]);
  });

  it("accumulates shift across consecutive straddles", () => {
    const units: UnitRect[] = [
      { top: 900, bottom: 1100, index: 0 },  // spacer 150, shift -> 150
      { top: 1800, bottom: 2000, index: 1 }, // shifted top 1950 straddles page 1
    ];
    // unit1: top 1950, page 1, bottomLimit 1950, bottom 2150 > 1950,
    //        target = 2*1000 + 50 = 2050, gap = 2050 - 1950 = 100
    expect(computeSpacers(units, M)).toEqual([
      { index: 0, height: 150 },
      { index: 1, height: 100 },
    ]);
  });

  it("leaves a unit taller than a usable band to line-split (no spacer)", () => {
    const units: UnitRect[] = [{ top: 100, bottom: 1100, index: 0 }]; // height 1000 > 900
    expect(computeSpacers(units, M)).toEqual([]);
  });
});

import { insertPageBreakSpacers } from "./paginate";

/** A full DOMRect so assignment to `el.getBoundingClientRect` type-checks. */
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

describe("insertPageBreakSpacers", () => {
  it("inserts nothing and returns a no-op cleanup when there are no marked units", () => {
    const root = document.createElement("div");
    root.getBoundingClientRect = () => domRect(0, 0);
    const cleanup = insertPageBreakSpacers(root, M);
    expect(root.querySelectorAll("[data-pdf-spacer]").length).toBe(0);
    expect(() => cleanup()).not.toThrow();
  });

  it("inserts a spacer before a straddling heading+block and removes it on cleanup", () => {
    const root = document.createElement("div");
    root.getBoundingClientRect = () => domRect(0, 0);
    const heading = marked("h2", "data-pdf-heading", 880, 900);
    const block = marked("div", "data-pdf-block", 905, 1100);
    root.appendChild(heading);
    root.appendChild(block);
    document.body.appendChild(root);

    // unit = heading.top(880)..block.bottom(1100), height 220, page 0,
    // bottomLimit 950, 1100 > 950 -> target 1050, gap = 1050 - 880 = 170,
    // inserted before the heading (unit index = heading elIndex 0).
    const cleanup = insertPageBreakSpacers(root, M);
    const spacers = root.querySelectorAll<HTMLElement>("[data-pdf-spacer]");
    expect(spacers.length).toBe(1);
    expect(spacers[0].style.height).toBe("170px");
    expect(spacers[0].nextElementSibling).toBe(heading);

    cleanup();
    expect(root.querySelectorAll("[data-pdf-spacer]").length).toBe(0);
    expect(heading.previousElementSibling).toBeNull();

    document.body.removeChild(root);
  });

  it("inserts a <tr> spacer (not a <div>) before a straddling table row", () => {
    // A <div> sibling would be an invalid table child; the spacer must be a <tr>
    // so it survives in the tbody and pushes the row down.
    const root = document.createElement("div");
    root.getBoundingClientRect = () => domRect(0, 0);
    const table = document.createElement("table");
    const tbody = document.createElement("tbody");
    const row = marked("tr", "data-pdf-block", 900, 1100); // straddles page 0
    tbody.appendChild(row);
    table.appendChild(tbody);
    root.appendChild(table);
    document.body.appendChild(root);

    const cleanup = insertPageBreakSpacers(root, M);
    const spacer = root.querySelector<HTMLElement>("[data-pdf-spacer]")!;
    expect(spacer.tagName).toBe("TR");
    expect(spacer.parentElement).toBe(tbody);
    expect(spacer.nextElementSibling).toBe(row);
    const cell = spacer.querySelector<HTMLTableCellElement>("td")!;
    expect(cell.style.height).toBe("150px"); // target 1050 - top 900

    cleanup();
    expect(root.querySelectorAll("[data-pdf-spacer]").length).toBe(0);

    document.body.removeChild(root);
  });
});
