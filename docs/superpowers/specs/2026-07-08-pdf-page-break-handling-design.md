# PDF Page-Break Handling — Design Spec

**Date:** 2026-07-08
**Status:** Approved (design + scope confirmed interactively)

## Overview

Improve how the exported PDF breaks across pages. Today a résumé that overflows
one page splits at arbitrary points — a section heading can be stranded at the
bottom of a page while its content flows to the next, and a single logical block
(a job entry with its bullets, a skill row) can be cut across the boundary
(exactly the SKILLS-section split in the reported screenshot). Additionally,
page 2+ content hugs the top edge with no top margin.

This adds a **block-aware page-break pre-pass** that runs on the offscreen
capture copy just before `doc.html()`. Where a keep-together block would straddle
a page boundary, it inserts an empty spacer sized so the block (a) starts cleanly
on the next page and (b) starts *below a top margin*, while leaving a bottom
margin on the page it left. No logical block is ever split.

### Confirmed decisions

1. **Graceful multi-page** — allow 2+ pages; do not force-fit to one page.
2. **Keep-together units:** each job/education entry, each skill row, and each
   section's **first** unit extended up to include its heading (a heading is
   never stranded — it moves with its first item). Sections may still break
   *between* items. A block genuinely taller than one usable page is left to
   line-split as today (nothing can be done).
3. **Scope: the four single-column templates only** — `classic`, `ledger`,
   `meridian`, `quill` — via a shared data-attribute marker. **Atlas is
   excluded**: it is a CSS grid two-column layout (`grid-template-columns: 200pt
   1fr`) whose linear top-to-bottom band model does not apply, and its full-bleed
   tinted sidebar must reach the page edges. Atlas is a one-page design and is
   left exactly as-is.
4. A résumé that fits on one page produces **zero** spacers ⇒ output is unchanged.

## Root cause (why today's breaks are bad)

`src/pdf/download.ts` hands the rendered DOM to jsPDF's `doc.html()` with
`autoPaging: "text"` and `margin: 0`. Inspecting jsPDF 2.5.2
(`dist/jspdf.es.js`, the text-draw path around line 14358) confirms:

- In `"text"` mode jsPDF only avoids slicing through an **individual line of
  text** — when one text element crosses the bottom of the page it (and
  everything after it) is pushed to the next page via `prevPageLastElemOffset`.
  There is **no** notion of keeping a block together, and jsPDF **ignores CSS
  fragmentation entirely** (`break-inside: avoid`, `page-break-*` do nothing). So
  a heading can fit at the bottom while its body is pushed away, and a multi-part
  block can straddle the boundary.
- With `margin: 0`, jsPDF slices the continuous content block into physical pages
  of exactly `pageHeight` (792pt). With `y: 0`, page *i* covers content-y in
  `[(i−1)·792, i·792)`. Page margins today come only from the template's own
  padding applied once around the whole block, so intermediate page breaks get no
  bottom margin on the page above and no top margin on the page below.

## Approach (why this one)

Three options were weighed:

1. **Block-aware spacer pre-pass (chosen).** Measure the laid-out copy; where a
   keep-together unit would straddle a page boundary, insert an empty spacer so
   it starts on the next page below a top margin. Works *with* jsPDF's existing
   line-level protection; stays entirely inside the current DOM→jsPDF pipeline;
   the break math is pure and unit-testable.
2. **Take over pagination (full measured slicing).** Disable `autoPaging` and
   render page-by-page ourselves. Maximum control, but a substantial rewrite of
   `download.ts` that fights the "author once, capture the DOM" design. Rejected
   as over-engineering.
3. **CSS `break-inside: avoid` / a different engine.** Not viable — jsPDF ignores
   CSS breaks; honoring them means adopting paged.js or browser print-to-PDF,
   discarding the vector/no-dependency architecture. Rejected.

### Margins are realized by the spacers, not by `doc.html`'s margin option

An earlier idea — pass `margin: [46,0,46,0]` to `doc.html()` and drop the root's
vertical padding — was **rejected** after inspecting the templates. The four
single-column templates use **three different margin models**:

| Template | Root padding | Page-1 top inset comes from |
|---|---|---|
| classic | `46 56 46` (`--margin-*`) | root padding-top |
| quill   | `46 56 46` (`--margin-*`) | root padding-top |
| ledger  | `34 50 30` | root padding-top |
| meridian| `0` | **full-bleed `.mrd-band` accent header** (`background: var(--c-accent)`) |

A uniform `doc.html` top margin would offset **all** page-1 content downward,
pushing a white strip above Meridian's full-bleed header (the same failure mode
that excludes Atlas's sidebar). So `doc.html` keeps `margin: 0` and the page-1
top inset is left untouched (each template's own padding / band still provides
it). The pre-pass instead reserves margins **only at the page breaks it creates**:

- **Bottom margin** on the page a block leaves — the block is pushed away, so the
  page ends at the last block that fit, leaving whitespace below it.
- **Top margin** on the next page — the block is pushed to `next-page-top + mt`,
  not flush to the physical top edge.

Break margins use a single uniform value from the theme (`mt = mb =
theme.page.marginTop = 46pt`) for all four templates. Ledger's own page-1 inset
(34/30) is preserved; its *continuation* pages simply get the slightly roomier
46pt — visually fine, and far simpler than per-template break margins.

### Robustness note

A spacer must not fight jsPDF's own line-level push. Because every keep-together
unit is made to fit within one usable band, no unit crosses a page boundary, so
jsPDF never pushes anything and `prevPageLastElemOffset` stays 0 — the pre-pass
fully determines pagination. The one exception is a unit taller than a usable
band (skipped, allowed to line-split); after such a rare block jsPDF may add its
own offset that our later spacers didn't anticipate. Worst case then is extra
whitespace or one imperfect break after an already-abnormal entry — never a
mid-block split.

## Template markers (the four single-column templates)

Add two data attributes to the existing elements in each Preview component.
Non-visual (data attributes never affect layout or the captured styles):

- `data-pdf-heading` on each section heading `<h2>`
  (`.section-heading` / `.ldg-sec-h` / `.mrd-sec-h` / `.qll-sec-h`).
- `data-pdf-block` on each keep-together unit — every direct child of a
  section body: each entry (`.resume-item` / `.ldg-item` / `.mrd-item` /
  `.qll-item`), each skill row (`.skill-row` / `.ldg-skill-row` / …), and each
  summary paragraph (`.resume-summary` / `.ldg-summary` / …).

The header block (name/headline/contact) is **not** marked — it lives on page 1
and never needs pushing. Atlas gets **no** markers, so the pre-pass finds no
units there and no-ops.

All four templates share the structure `section > h2(heading) + div(body) >
{item|skill-row|summary-p}`, so the edit is the same shape in each file.

## Module — `src/pdf/paginate.ts` (new)

Split into a pure half (all the math, DOM-free, unit-tested) and a thin DOM half.

### Pure half

```ts
/** A measured flow element (heading or keep-together block), px from root top. */
export interface FlowNode {
  kind: "heading" | "block";
  top: number;
  bottom: number;
  elIndex: number; // position among the collected flow elements (insert target)
}

/** A measured keep-together unit, in CSS px relative to the capture root's top. */
export interface UnitRect {
  top: number;     // offset of the unit's top edge (heading top if glued)
  bottom: number;  // offset of the unit's bottom edge
  index: number;   // elIndex of the unit's TOP element = the insert-before target
}

/**
 * Glue each heading to the FIRST block that follows it into one unit; every
 * later block in the same section is its own unit. Pure — the DOM half feeds it
 * measured FlowNodes.
 */
export function buildUnits(nodes: FlowNode[]): UnitRect[];

/** Page geometry, all in CSS px. */
export interface PageMetrics {
  pageH: number;   // full physical page height  (792pt → px)
  mt: number;      // top margin reserved on pushed (page ≥2) content
  mb: number;      // bottom margin reserved before a forced break
}

/** A spacer to insert before unit `index`, `height` px tall. */
export interface Spacer {
  index: number;
  height: number;
}

/**
 * Given units in document order and page geometry, return the spacers that keep
 * every fit-on-a-page unit from straddling a page boundary — reserving a bottom
 * margin on the page left and a top margin on the page joined. Sequential: each
 * inserted spacer shifts all following units down.
 */
export function computeSpacers(units: UnitRect[], m: PageMetrics): Spacer[];
```

Algorithm (all coordinates in the capture root's content-y, px):

```
usableBand = m.pageH - m.mt - m.mb      // height a pushable unit must fit within
EPS = 0.5                               // sub-pixel tolerance
shift = 0
spacers = []
for unit of units (document order):
    top    = unit.top + shift
    height = unit.bottom - unit.top
    bottom = top + height
    page       = floor(top / m.pageH)          // 0-based physical page of the top
    bottomLimit = (page + 1) * m.pageH - m.mb   // last y allowed on this page
    if bottom > bottomLimit + EPS && height <= usableBand + EPS:
        target = (page + 1) * m.pageH + m.mt    // next page top + top margin
        gap = target - top
        spacers.push({ index: unit.index, height: gap })
        shift += gap
return spacers
```

- Unit with `height > usableBand`: no spacer (jsPDF line-splits it, as today).
- Unit already within its page's `[.., bottomLimit]`: no spacer.
- `floor(top / pageH)` maps content-y to its 0-based physical page (valid because
  `doc.html` uses `margin: 0`, `y: 0` ⇒ page *i* spans `[(i−1)·pageH, i·pageH)`).

### DOM half

```ts
/**
 * Measure the keep-together units in `root`, insert page-break spacers, and
 * return a cleanup fn that removes them. No-op (returns a no-op cleanup) when
 * `root` has no [data-pdf-block] units (e.g. Atlas, or a single-page résumé
 * with nothing to push). Call AFTER fonts are ready and min-height is
 * neutralized, so measurements are final.
 */
export function insertPageBreakSpacers(
  root: HTMLElement,
  m: PageMetrics,
): () => void;
```

Steps:
1. **Collect flow nodes** in document order:
   `root.querySelectorAll("[data-pdf-heading],[data-pdf-block]")` (returns
   document order). If empty, return `() => {}`.
2. **Measure into `FlowNode[]`.** Collect the elements into an array `els` (the
   NodeList in document order). `rootTop = root.getBoundingClientRect().top`; for
   each element at position `i` build
   `{ kind: el.hasAttribute("data-pdf-heading") ? "heading" : "block",
     top: el.getBoundingClientRect().top − rootTop,
     bottom: el.getBoundingClientRect().bottom − rootTop, elIndex: i }`.
3. **`buildUnits(flowNodes)`** → `UnitRect[]` (glues each heading to its first
   block; `index` is the top element's `elIndex`).
4. **`computeSpacers(units, m)`** → `Spacer[]`.
5. **Insert** each spacer before `els[spacer.index]`, as a `<div>` with
   `style.height = height+"px"; margin = 0; padding = 0; display = "block"` and a
   `data-pdf-spacer` marker, before that unit's `topEl`
   (`topEl.parentNode.insertBefore(spacer, topEl)`). Units hold direct element
   references, so all inserts can be applied in one pass — an earlier insert never
   invalidates a later unit's stored `topEl`.
6. Return a cleanup that removes every inserted spacer node.

`PageMetrics` is built in `download.ts` from the theme (see below), so
`paginate.ts` imports nothing from the theme.

## Integration — `src/pdf/download.ts`

`renderResumeDoc` changes only. `doc.html`'s options are **unchanged** (still
`margin: 0`) — margins are handled by the pre-pass. New: import
`insertPageBreakSpacers` and `PageMetrics` from `./paginate` and `theme` (already
imported), build metrics, run the pre-pass, remove spacers in `finally`:

```ts
const PT = theme.page;
const metrics = {
  pageH: PT.height * PX,        // 792pt → px
  mt: PT.marginTop * PX,        // 46pt → px  (top margin on pushed pages)
  mb: PT.marginTop * PX,        // 46pt → px  (bottom margin before a break)
};

const prevMinHeight = element.style.minHeight;
element.style.minHeight = "0px";              // existing trailing-blank-page fix
const removeSpacers = insertPageBreakSpacers(element, metrics);
try {
  await doc.html(element, {
    x: 0, y: 0,
    width: theme.page.width,
    windowWidth: Math.round(theme.page.width * PX),
    margin: 0,
    autoPaging: "text",
    fontFaces: pdfFontFacesFor(used),
  });
} finally {
  removeSpacers();
  element.style.minHeight = prevMinHeight;
}
```

`downloadResumePdf`'s signature and callers are unchanged. The offscreen copy is
disposable, but spacers are still removed in `finally` so the function stays pure
w.r.t. the element it is handed.

## Edge cases

- **Single-page résumé / Atlas:** no unit straddles / no `[data-pdf-block]`
  present ⇒ `computeSpacers` returns `[]` / the DOM half no-ops ⇒ identical
  output. (Guarded by tests.)
- **Entry taller than a usable band:** skipped; jsPDF line-splits it (unchanged
  degraded case, now rare).
- **Heading + first item taller than a band combined:** treated as one unit; if
  it exceeds the band it is skipped (heading may then line-split with its item).
- **Consecutive straddles:** handled by the accumulating `shift`.
- **Empty / hidden sections:** not rendered (components guard on non-empty data),
  so no zero-height units appear, and a heading always has a following block.

## Testing

- **`src/pdf/paginate.test.ts` (new, DOM-free) — primary test.**
  `buildUnits` glue cases with fabricated `FlowNode[]`:
  - heading + one block ⇒ one unit spanning heading.top→block.bottom, `index` =
    heading's `elIndex`.
  - heading + three blocks ⇒ four... no: one glued unit (heading+block1) + blocks
    2 and 3 as their own units (three units total), each later unit's `index` =
    its own `elIndex`.
  - block with no preceding heading ⇒ its own unit.
  Then `computeSpacers` with fabricated `UnitRect[]` + a fixed `PageMetrics`:
  - all units within one band ⇒ `[]`.
  - one unit straddling ⇒ one spacer; its pushed top equals
    `(page+1)*pageH + mt`, and it now sits fully inside the next band.
  - heading+first-item unit straddling ⇒ spacer targets that unit's `index`.
  - two consecutive straddles ⇒ second spacer computed against the shifted
    position (accumulation correct).
  - a unit with `height > usableBand` ⇒ no spacer for it.
  - a unit ending exactly on `bottomLimit` (within EPS) ⇒ no spacer.
- **`insertPageBreakSpacers` in jsdom (with stubbed rects).** jsdom's
  `getBoundingClientRect` returns zeros, but a test can override it per element
  (`el.getBoundingClientRect = () => ({ top, bottom, ... })`). Build a root with
  `data-pdf-heading` / `data-pdf-block` elements, stub their rects to force a
  straddle, call the function, and assert: the right number of `[data-pdf-spacer]`
  divs are inserted at the right positions; the no-units case inserts nothing and
  returns a no-op cleanup; and cleanup removes every spacer.
- **No jsdom test of `download.ts` / `doc.html`.** That path is browser-only
  (jsPDF needs real layout) and `App.test.tsx` already stubs the `download`
  module wholesale, so there is no `doc.html` harness. Covered by the browser
  verification below.
- **Template marker tests:** extend each single-column template's existing
  preview test (or add a focused assertion) that a rendered `.<x>item` /
  `.<x>skill-row` / heading carries `data-pdf-block` / `data-pdf-heading`, and
  that the Atlas preview has **no** `[data-pdf-block]`.
- **Browser verification** (playwright-core + system Chrome vs `pnpm preview`,
  per the project harness): with a résumé that overflows one page, for each of
  the four single-column templates:
  - `node scripts/inspect-pdf.mjs resume.pdf` still reports **VECTOR**, 0 images,
    embedded Inter/SourceSerif;
  - `pdftotext -layout` confirms a job title and its bullets land on the **same**
    page and no section heading is the last line of a page;
  - page 2 content starts below a top margin (not flush to the edge);
  - Atlas: output is byte-for-byte unchanged (full-bleed sidebar intact).
- Full existing suite + `pnpm build` (0 type errors) stay green; a single-page
  sample résumé produces an unchanged PDF.

## Non-goals

- No fit-to-one-page auto-shrink or overflow warning (graceful multi-page chosen).
- No Atlas / two-column pagination (excluded by scope).
- No taking over pagination / disabling `autoPaging`.
- No CSS `break-inside`/paged.js/browser-print path.
- No per-template break-margin values — a single uniform `theme.page.marginTop`
  is used for all four single-column templates' break spacers.
- No "Page N of M" footers or running headers.
- No attempt to prevent splitting a single entry taller than a usable page.
