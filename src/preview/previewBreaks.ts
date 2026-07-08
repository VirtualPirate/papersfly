/**
 * Visible page-break dividers for the LIVE preview.
 *
 * This is the on-screen sibling of download.ts's insertPageBreakSpacers: it uses
 * the identical pagination math (buildUnits + computeSpacers) but the node it
 * inserts is a VISIBLE "Page N" divider, it takes the preview's CSS scale (so it
 * can undo the transform when measuring), and it is left in place (removed only
 * on cleanup / the next reactive pass). It only ever adds and removes its own
 * sibling <div>s — never a React-managed node — so it is safe to run against the
 * live React preview subtree. It touches only the visible preview; the exported
 * PDF (drawn from the separate .pdf-capture copy) is unaffected.
 */
import {
  buildUnits,
  computeSpacers,
  type FlowNode,
  type PageMetrics,
} from "../pdf/paginate";

export function insertPreviewBreaks(
  root: HTMLElement,
  m: PageMetrics,
  scale: number,
): () => void {
  const els = Array.from(
    root.querySelectorAll<HTMLElement>("[data-pdf-heading],[data-pdf-block]"),
  );
  if (els.length === 0) return () => {};

  // getBoundingClientRect is in scaled px; divide by the display scale to recover
  // the true px that PageMetrics is expressed in.
  const s = scale || 1;
  const rootTop = root.getBoundingClientRect().top;
  const nodes: FlowNode[] = els.map((el, elIndex) => {
    const r = el.getBoundingClientRect();
    return {
      kind: el.hasAttribute("data-pdf-heading") ? "heading" : "block",
      top: (r.top - rootTop) / s,
      bottom: (r.bottom - rootTop) / s,
      elIndex,
    };
  });

  const spacers = computeSpacers(buildUnits(nodes), m);
  const doc = root.ownerDocument;
  const inserted: HTMLElement[] = [];
  spacers.forEach((sp, i) => {
    const target = els[sp.index];
    const brk = doc.createElement("div");
    brk.className = "page-break";
    brk.setAttribute("data-preview-break", "");
    brk.setAttribute("aria-hidden", "true");
    brk.style.height = `${sp.height}px`;

    const line = doc.createElement("div");
    line.className = "page-break-line";
    line.style.top = `${sp.height - m.mt}px`; // the exact page-cut offset

    const label = doc.createElement("span");
    label.className = "page-break-label";
    label.textContent = `Page ${i + 2}`; // the i-th break starts page i+2

    line.appendChild(label);
    brk.appendChild(line);
    target.parentNode?.insertBefore(brk, target);
    inserted.push(brk);
  });

  return () => {
    for (const brk of inserted) brk.remove();
  };
}
