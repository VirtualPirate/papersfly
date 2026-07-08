/**
 * Block-aware page-break pre-pass for the vector PDF export.
 *
 * jsPDF's doc.html() (autoPaging "text") only avoids slicing an individual line
 * of text; it has no concept of keeping a logical block together and ignores CSS
 * break-inside. This module measures the laid-out capture copy and inserts empty
 * spacer <div>s so no keep-together block (a résumé entry, a skill row, or a
 * section heading + its first item) straddles a page boundary — and so pushed
 * blocks land below a top margin, leaving a bottom margin on the page they left.
 *
 * Pure math (buildUnits, computeSpacers) is separated from DOM measurement
 * (insertPageBreakSpacers) so the break logic is unit-testable without layout.
 * All numbers are CSS px in the capture root's coordinate space (y = 0 at the
 * root's top). Valid because doc.html() is called with margin:0 and y:0, so
 * physical page i spans content-y [(i-1)*pageH, i*pageH).
 */

/** A measured flow element (heading or keep-together block), px from root top. */
export interface FlowNode {
  kind: "heading" | "block";
  top: number;
  bottom: number;
  elIndex: number; // position among the collected flow elements (insert target)
}

/** A measured keep-together unit, px relative to the capture root's top. */
export interface UnitRect {
  top: number;
  bottom: number;
  index: number; // elIndex of the unit's TOP element = the insert-before target
}

/** Page geometry, all in CSS px. */
export interface PageMetrics {
  pageH: number; // full physical page height
  mt: number;    // top margin reserved on pushed (page >= 2) content
  mb: number;    // bottom margin reserved before a forced break
}

/** A spacer to insert before the element at `index`, `height` px tall. */
export interface Spacer {
  index: number;
  height: number;
}

/** Sub-pixel tolerance so a block ending exactly on the limit is not pushed. */
const EPS = 0.5;

/**
 * Glue each heading to the FIRST block that follows it into one unit; every
 * later block in the same section is its own unit. A block with no pending
 * heading is its own unit; a trailing heading with no following block is dropped.
 */
export function buildUnits(nodes: FlowNode[]): UnitRect[] {
  const units: UnitRect[] = [];
  let pendingHeading: FlowNode | null = null;
  for (const node of nodes) {
    if (node.kind === "heading") {
      pendingHeading = node;
      continue;
    }
    const topNode = pendingHeading ?? node;
    units.push({ top: topNode.top, bottom: node.bottom, index: topNode.elIndex });
    pendingHeading = null;
  }
  return units;
}

/**
 * For each keep-together unit that would straddle a page boundary (and still
 * fits within a usable band), return the spacer that pushes it to the next
 * page's content top (page top + top margin). Sequential: each spacer shifts all
 * following units down by its height.
 */
export function computeSpacers(units: UnitRect[], m: PageMetrics): Spacer[] {
  const usableBand = m.pageH - m.mt - m.mb;
  const spacers: Spacer[] = [];
  let shift = 0;
  for (const unit of units) {
    const top = unit.top + shift;
    const height = unit.bottom - unit.top;
    const bottom = top + height;
    const page = Math.floor(top / m.pageH);
    const bottomLimit = (page + 1) * m.pageH - m.mb;
    if (bottom > bottomLimit + EPS && height <= usableBand + EPS) {
      const target = (page + 1) * m.pageH + m.mt;
      const gap = target - top;
      spacers.push({ index: unit.index, height: gap });
      shift += gap;
    }
  }
  return spacers;
}

/**
 * Measure the keep-together units in `root`, insert page-break spacers, and
 * return a cleanup fn that removes them. No-op when `root` has no [data-pdf-block]
 * units (Atlas, or a résumé with nothing to push). Call AFTER fonts are ready
 * and min-height is neutralized so measurements are final.
 */
export function insertPageBreakSpacers(root: HTMLElement, m: PageMetrics): () => void {
  const els = Array.from(
    root.querySelectorAll<HTMLElement>("[data-pdf-heading],[data-pdf-block]"),
  );
  if (els.length === 0) return () => {};

  const rootTop = root.getBoundingClientRect().top;
  const nodes: FlowNode[] = els.map((el, elIndex) => {
    const r = el.getBoundingClientRect();
    return {
      kind: el.hasAttribute("data-pdf-heading") ? "heading" : "block",
      top: r.top - rootTop,
      bottom: r.bottom - rootTop,
      elIndex,
    };
  });

  const spacers = computeSpacers(buildUnits(nodes), m);
  const inserted: HTMLElement[] = [];
  for (const s of spacers) {
    const target = els[s.index];
    const spacer = root.ownerDocument.createElement("div");
    spacer.setAttribute("data-pdf-spacer", "");
    spacer.style.height = `${s.height}px`;
    spacer.style.margin = "0";
    spacer.style.padding = "0";
    spacer.style.display = "block";
    target.parentNode?.insertBefore(spacer, target);
    inserted.push(spacer);
  }

  return () => {
    for (const spacer of inserted) spacer.remove();
  };
}
