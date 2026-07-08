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

    // The `.page-break` div is the visible divider box (relative-positioned, sized
    // to the gap). Its host is that div directly, unless the target is a table row
    // — then the host is a <tr><td> and the box lives inside the cell, so it stays
    // a valid table child (a <div> sibling would render outside the row flow).
    const isRow = target.tagName === "TR";
    const box = doc.createElement("div");
    box.className = "page-break";
    box.style.height = `${sp.height}px`;

    let host: HTMLElement;
    if (isRow) {
      host = doc.createElement("tr");
      const td = doc.createElement("td");
      td.colSpan = 99;
      td.style.padding = "0";
      td.style.border = "0";
      td.appendChild(box);
      host.appendChild(td);
    } else {
      host = box;
    }
    host.setAttribute("data-preview-break", "");
    host.setAttribute("aria-hidden", "true");

    const line = doc.createElement("div");
    line.className = "page-break-line";
    line.style.top = `${sp.height - m.mt}px`; // the exact page-cut offset

    const label = doc.createElement("span");
    label.className = "page-break-label";
    label.textContent = `Page ${i + 2}`; // the i-th break starts page i+2

    line.appendChild(label);
    box.appendChild(line);
    target.parentNode?.insertBefore(host, target);
    inserted.push(host);
  });

  return () => {
    for (const brk of inserted) brk.remove();
  };
}
