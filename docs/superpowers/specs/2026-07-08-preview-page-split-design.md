# Preview Page-Split — Design Spec

**Date:** 2026-07-08
**Status:** Approved (design + scope confirmed interactively)

## Overview

Show the reader where the exported PDF breaks across pages, **in the live
preview**, without changing the exported PDF in any way. The preview currently
renders the resume as **one continuous white sheet** (`.page-frame`) that simply
grows taller as content overflows one page — there is no visual page division, so
the user cannot tell where page 2 begins until they download.

This adds a **faithful paginated preview**: the on-screen sheet visibly reflows
so each keep-together block that would straddle a page boundary is pushed down
below a "Page N" divider, with the same top/bottom margins the PDF uses. It is
driven by the **exact same pagination math** that produces the PDF (`buildUnits`
+ `computeSpacers` in `src/pdf/paginate.ts`), so the preview split is guaranteed
to match the export.

### Confirmed decisions

1. **Faithful (WYSIWYG) reflow**, not a mere guide line: content is physically
   pushed onto the next page region with real margins, exactly as exported.
2. **Always on** — dividers appear automatically whenever the resume overflows
   one page; nothing is shown for a single-page resume. No toggle.
3. **Atlas shows nothing** — Atlas (two-column) has no `data-pdf-*` markers and is
   excluded from block-aware pagination; its preview stays the plain continuous
   sheet, matching how its PDF already behaves. Same no-op path as the PDF.
4. **The exported PDF is byte-for-byte unchanged.** The preview and the PDF are
   drawn from separate DOM subtrees (see below); this feature only touches the
   preview subtree, and only transiently-owned decoration nodes within it.

## Why the PDF cannot be affected (the key invariant)

`src/App.tsx` keeps two independent DOM subtrees:

- the **visible preview** — `.preview › .page-frame › .page-scaler › <Preview/>`,
  wrapped in `transform: scale()` to fit the screen; and
- the **offscreen capture copy** — `.pdf-capture`, mounted *only during a
  download* from a **frozen** data snapshot and the preloaded concrete component,
  at true size. `src/pdf/download.ts` draws the PDF from *this* copy alone, and
  runs its **own** `insertPageBreakSpacers`/cleanup pass on it.

This feature adds decoration to the **visible preview** subtree only. `.pdf-capture`
is created fresh from React state at download time and never sees a preview
decoration node, so the export is provably unaffected.

## Approach (why decorate in place, not clone)

To reflect the reflow faithfully, a spacer must be inserted **before** each
straddling keep-together block to push it down. Two placements were considered:

1. **Decorate the live preview in place (chosen).** Insert the break nodes as
   extra sibling `<div>`s within the already-rendered `<Preview>` `.resume-page`,
   in a layout effect, and remove them in the effect's cleanup — exactly the
   pattern `download.ts` already uses on the capture copy, only left visible and
   re-run reactively. Minimal change; the visible preview stays the single, live,
   reactive React `.resume-page` (so existing behavior and tests are unchanged).
2. **Render a decorated clone in a React-leaf, hiding the live one.** Rejected: it
   creates a second `.resume-page` (duplicate headings/content), breaks the
   `App.test.tsx` assertions that query the single live `.resume-page` for live
   variant/font updates, and doubles rendering — all to avoid a React-safety
   concern that does not actually arise here (see next).

### React-safety of in-place decoration

The decoration only ever **adds and later removes its own sibling `<div>`s**; it
never wraps, moves, or removes a React-managed node. React reconciles its own
children by fiber references (`insertBefore`/`removeChild` always target nodes
React owns), so foreign siblings do not perturb it — the documented React/DOM
crash cases (Grammarly, Google Translate) all stem from mutating React's *own*
nodes, which this does not do. `download.ts` already relies on exactly this
(insert spacers into a `.resume-page`, then remove) with no issue. Cleanup uses
`node.remove()`, which is a safe no-op if React already detached the ancestor.

Each measurement pass removes the previous pass's nodes first (via effect
cleanup, which runs after the next commit and before the next effect), so
measurement always happens on an undecorated tree and stale nodes never
accumulate.

## Module — `src/preview/previewBreaks.ts` (new)

A thin DOM function that reuses the pure math from `src/pdf/paginate.ts`
(`buildUnits`, `computeSpacers`, `FlowNode`, `PageMetrics`) unchanged. It is the
visible sibling of `insertPageBreakSpacers`: same measurement + math, but the
inserted node is a *visible* divider and it takes the preview's display `scale`.

```ts
/**
 * Decorate the live preview `root` (a scaled .resume-page) with visible
 * page-break dividers: before each keep-together block that would straddle a
 * page boundary, insert a spacer that pushes it onto the next page below a top
 * margin, carrying a "Page N" divider line at the exact page cut. Returns a
 * cleanup that removes every inserted node. No-op cleanup when `root` has no
 * [data-pdf-block] units (e.g. Atlas) or nothing overflows.
 *
 * `scale` is the preview's current CSS transform scale: getBoundingClientRect
 * returns scaled px, so measured offsets are divided by it to recover the true
 * px the PageMetrics are expressed in.
 */
export function insertPreviewBreaks(
  root: HTMLElement,
  m: PageMetrics,
  scale: number,
): () => void;
```

Steps:
1. `els = root.querySelectorAll("[data-pdf-heading],[data-pdf-block]")`; if empty
   return `() => {}`.
2. Measure into `FlowNode[]`: `rootTop = root.getBoundingClientRect().top`; for
   each element, `top = (rect.top − rootTop) / scale`, `bottom = (rect.bottom −
   rootTop) / scale` (true px, undoing the display scale), plus its `elIndex` and
   `kind` (from `hasAttribute("data-pdf-heading")`).
3. `spacers = computeSpacers(buildUnits(nodes), m)` — the identical call the PDF
   makes.
4. For each spacer (0-based ordinal `i`), insert before `els[spacer.index]` a
   `<div data-preview-break>` of height `spacer.height` px (true px; the scaled
   container renders it scaled), containing:
   - a `.page-break-line` positioned `spacer.height − m.mt` px from the node's top
     (the exact page cut: the page edge sits `height − mt` below the gap top,
     leaving `mt` of top margin below it — derivation below), and
   - a `.page-break-label` reading `Page ${i + 2}`.
   The node is `aria-hidden` (decorative; not resume content).
5. Return a cleanup that calls `.remove()` on every inserted node.

**Cut-line derivation:** a spacer's height is `gap = (page+1)·pageH + mt −
shiftedTop`; the physical page edge is at `(page+1)·pageH`, i.e. `gap − mt` below
the gap's top. So the line sits at `height − mt`, with the leaving page's last
block above it (remaining bottom margin as whitespace) and `mt` of top margin
below it. `height > mt` always (the block sits on its page), so the offset is
positive.

`PageMetrics` is built in `App.tsx` from the theme (`pageH = theme.page.height ·
PX`, `mt = mb = theme.page.marginTop · PX`), identical to `download.ts`, so
`previewBreaks.ts` imports nothing from the theme.

## Integration — `src/App.tsx`

The visible preview markup is **unchanged** (the live `<Preview>` stays in
`.page-scaler`, still measured by `pageRef` for `frame.h` — which now grows to
include the divider gaps via the existing `ResizeObserver`). One addition:

- **Pagination layout effect**, keyed on `[data, variant, fontOverrides,
  template, scale]`: find `pageRef.current`’s `.resume-page`; if present, after
  `document.fonts` is ready
  (`await (document.fonts?.ready ?? Promise.resolve())`, guarded so jsdom without
  a `FontFaceSet` still works), call `insertPreviewBreaks(page, metrics, scale)`
  and store its cleanup; the effect's cleanup calls it. `scale` is a dependency
  because measurement reads scaled rects; recomputing when the fit-scale changes
  keeps the measurement correct. (Breaks themselves are scale-independent true px,
  so this only re-measures, never changes the result for a given resume.)
- `handleDownload`, `.pdf-capture`, and `download.ts` are **untouched**.

Because `insertPreviewBreaks` runs after layout, and jsdom reports zero-size rects
(so `computeSpacers` finds no straddle → no nodes), the effect is inert under the
test environment — existing tests keep seeing exactly one undecorated
`.resume-page`.

## Styling — `src/index.css`

- `.page-break` (`[data-preview-break]`) — `position: relative;` block; its height
  is set inline. Its background is transparent (it sits over the white sheet); the
  gap reads as page margin whitespace with the divider line marking the cut.
- `.page-break-line` — absolutely positioned at the inline cut offset: a
  full-width hairline (dashed `var(--panel-border)`) spanning the sheet width.
- `.page-break-label` — a small, muted, non-serif "Page N" pill centered on the
  line (its own background so the line reads as passing behind it).

All three are decorative and live only in the preview; they are never in
`.pdf-capture`, so they never reach the PDF.

## Testing

- **`src/preview/previewBreaks.test.ts` (new, jsdom) — primary test.** Reuse the
  `paginate.test.ts` rect-stub pattern (`el.getBoundingClientRect = () =>
  domRect(top, bottom)`), `scale = 1`:
  - single page (no unit straddles) → **0** `[data-preview-break]` nodes, cleanup
    is a safe no-op;
  - one straddling heading+block unit → **1** node inserted before the right
    element, height = the computed gap, label "Page 2", line offset = `height −
    mt`; cleanup removes it;
  - two consecutive straddles → **2** nodes, labels "Page 2" / "Page 3";
  - **no markers** (Atlas-like markup) → **0** nodes, no-op cleanup;
  - `scale = 0.5` → measured offsets are doubled back to true px (same break as
    `scale = 1` for equivalently-scaled rects), proving the scale compensation.
- **`src/App.test.tsx` (extend).** jsdom has no real layout, so assert the
  feature is inert, not its pagination: the default single-page render shows
  **no** `[data-preview-break]` and does not crash, and `download` (already
  stubbed) is still handed the single `.resume-page` (existing test unaffected).
- **Browser verification** (playwright-core + system Chrome vs `pnpm preview`):
  with a resume that overflows one page, for each single-column template
  (Classic, Ledger, Meridian, Quill):
  - the preview shows a "Page 2" divider, and the block immediately below it is
    the **same** block that starts page 2 in the downloaded PDF (compare against
    `pdftotext -layout`);
  - no block is split at the divider (matches the PDF's block-aware break);
  - the downloaded PDF is unchanged from before this feature — same `inspect-pdf`
    VECTOR verdict, page count, and text as the page-break feature verified, and
    **no `[data-preview-break]` appears in the captured PDF** (`pdftotext` shows
    no "Page N" label text);
  - **Atlas**: preview shows no divider; its PDF is unchanged.
- Full existing suite + `pnpm build` (0 type errors) stay green.

## Non-goals

- No change to the PDF pipeline, `paginate.ts` math, or the `data-pdf-*` markers.
- No per-page separate "sheet" cards with individual shadows (a single scaled
  frame with in-flow dividers is enough; a true multi-card rework is out of scope
  / YAGNI).
- No Atlas / two-column preview pagination.
- No toggle, and no "Page N of M" chrome beyond the divider label.
- No decorated clone / offscreen preview source (rejected above).
```
