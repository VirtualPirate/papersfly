# PDF Page-Break Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the exported PDF from splitting a résumé entry, skill row, or section heading across a page boundary, and give every page (not just page 1) proper top/bottom margins.

**Architecture:** A block-aware pre-pass measures the offscreen capture copy just before `doc.html()` and inserts empty spacer `<div>`s so each keep-together block starts cleanly on the next page below a top margin, leaving a bottom margin on the page it left. Pure break math (`buildUnits`, `computeSpacers`) is isolated from DOM measurement (`insertPageBreakSpacers`) for unit-testing. jsPDF keeps `margin: 0`; margins are realized by the spacers, so full-bleed page-1 headers stay intact. Applies to the four single-column templates via `data-pdf-*` markers; Atlas (two-column) is excluded.

**Tech Stack:** TypeScript, React, Astro, jsPDF 2.5.2 (`doc.html`), Vitest + @testing-library/react, pnpm, Vite 8.

## Global Constraints

- Package manager is **pnpm**; test runner is **vitest**. Toolchain is on **vite@8** — never re-pin vite@5.
- **Commits are the user's responsibility** — do NOT run `git commit`. End each task at a green state (tests pass, `pnpm build` clean) and report; the user commits.
- The app is **fully client-side**; the PDF path is **browser-only**. `pnpm build && pnpm preview` is the source of truth for exported-PDF appearance (the Astro dev toolbar stays disabled).
- All theme measurements are in **PostScript points**; `PX = 96 / 72` converts pt→CSS px (the page renders at true size, 612pt = 816px wide).
- **Zero regression:** a résumé that fits one page, and every Atlas résumé, must export byte-for-byte as today (the pre-pass must no-op for them).
- `pnpm build` runs `astro check` — it must report **0 type errors**. Test files are type-checked too; keep them well-typed.

---

### Task 1: Pure break math — `buildUnits` + `computeSpacers`

**Files:**
- Create: `src/pdf/paginate.ts`
- Test: `src/pdf/paginate.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports).
- Produces:
  - `interface FlowNode { kind: "heading" | "block"; top: number; bottom: number; elIndex: number }`
  - `interface UnitRect { top: number; bottom: number; index: number }`
  - `interface PageMetrics { pageH: number; mt: number; mb: number }` — all CSS px
  - `interface Spacer { index: number; height: number }`
  - `function buildUnits(nodes: FlowNode[]): UnitRect[]`
  - `function computeSpacers(units: UnitRect[], m: PageMetrics): Spacer[]`

- [ ] **Step 1: Write the failing tests**

Create `src/pdf/paginate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/pdf/paginate.test.ts`
Expected: FAIL — `Failed to resolve import "./paginate"` / functions not defined.

- [ ] **Step 3: Write the minimal implementation**

Create `src/pdf/paginate.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/pdf/paginate.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Checkpoint**

Run: `pnpm exec vitest run src/pdf/paginate.test.ts` → green. Do not commit (user commits). Report the green state.

---

### Task 2: DOM half — `insertPageBreakSpacers`

**Files:**
- Modify: `src/pdf/paginate.ts` (append the DOM function)
- Test: `src/pdf/paginate.test.ts` (append a `describe` block)

**Interfaces:**
- Consumes: `buildUnits`, `computeSpacers`, `FlowNode`, `PageMetrics` (Task 1).
- Produces: `function insertPageBreakSpacers(root: HTMLElement, m: PageMetrics): () => void` — measures `[data-pdf-heading],[data-pdf-block]` in `root`, inserts `<div data-pdf-spacer>` spacers, returns a cleanup that removes them. No-op (returns a no-op cleanup) when there are no marked blocks.

- [ ] **Step 1: Write the failing tests**

Append to `src/pdf/paginate.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/pdf/paginate.test.ts`
Expected: FAIL — `insertPageBreakSpacers` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Append to `src/pdf/paginate.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/pdf/paginate.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Checkpoint**

Run: `pnpm exec vitest run src/pdf/paginate.test.ts` → green. Report; do not commit.

---

### Task 3: Add `data-pdf-*` markers to the four single-column templates

**Files:**
- Modify: `src/templates/classic/ClassicPreview.tsx`
- Modify: `src/templates/ledger/LedgerPreview.tsx`
- Modify: `src/templates/meridian/MeridianPreview.tsx`
- Modify: `src/templates/quill/QuillPreview.tsx`
- Test: `src/templates/markers.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks (independent).
- Produces: DOM markers the Task 4 pre-pass keys off — `data-pdf-heading` on every section `<h2>`, `data-pdf-block` on every entry, skill row, and summary paragraph. Atlas is intentionally left unmarked.

Each edit adds a bare `data-pdf-heading` / `data-pdf-block` attribute to an existing element (no styling impact). Use `replace_all` where an opening tag repeats (headings appear 4×, item wrappers appear 2× across Experience + Education).

- [ ] **Step 1: Write the failing test**

Create `src/templates/markers.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { sampleResume } from "@/data/resume";
import ClassicPreview from "./classic/ClassicPreview";
import LedgerPreview from "./ledger/LedgerPreview";
import MeridianPreview from "./meridian/MeridianPreview";
import QuillPreview from "./quill/QuillPreview";
import AtlasPreview from "./atlas/AtlasPreview";

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

  it("does not mark Atlas (two-column, excluded from the pre-pass)", () => {
    const { container } = render(<AtlasPreview data={sampleResume} />);
    expect(container.querySelectorAll("[data-pdf-heading]").length).toBe(0);
    expect(container.querySelectorAll("[data-pdf-block]").length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/templates/markers.test.tsx`
Expected: FAIL — the four templates yield 0 `[data-pdf-heading]` / `[data-pdf-block]` (Atlas case already passes).

- [ ] **Step 3: Edit `ClassicPreview.tsx`**

Apply these exact replacements:

- `<h2 className="section-heading">` → `<h2 className="section-heading" data-pdf-heading>` (replace_all — 4 occurrences).
- `<p className="resume-summary" style={f("summary")}>` → `<p className="resume-summary" data-pdf-block style={f("summary")}>`.
- `<div className="resume-item" key={item.id}>` → `<div className="resume-item" data-pdf-block key={item.id}>` (replace_all — 2 occurrences).
- `<div className="skill-row" key={g.id}>` → `<div className="skill-row" data-pdf-block key={g.id}>`.

- [ ] **Step 4: Edit `LedgerPreview.tsx`**

- `<h2 className="ldg-sec-h">` → `<h2 className="ldg-sec-h" data-pdf-heading>` (replace_all — 4 occurrences).
- `<p className="ldg-summary" style={f("summary")}>` → `<p className="ldg-summary" data-pdf-block style={f("summary")}>`.
- `<div className="ldg-item" key={item.id}>` → `<div className="ldg-item" data-pdf-block key={item.id}>` (replace_all — 2 occurrences).
- `<div className="ldg-skill-row" key={g.id}>` → `<div className="ldg-skill-row" data-pdf-block key={g.id}>`.

- [ ] **Step 5: Edit `MeridianPreview.tsx`**

- `<h2 className="mrd-sec-h">` → `<h2 className="mrd-sec-h" data-pdf-heading>` (replace_all — 4 occurrences).
- `<p className="mrd-summary" style={f("summary")}>` → `<p className="mrd-summary" data-pdf-block style={f("summary")}>`.
- `<div className="mrd-item" key={item.id}>` → `<div className="mrd-item" data-pdf-block key={item.id}>` (replace_all — 2 occurrences).
- `<div className="mrd-skill-row" key={g.id}>` → `<div className="mrd-skill-row" data-pdf-block key={g.id}>`.

- [ ] **Step 6: Edit `QuillPreview.tsx`**

- `<h2 className="qll-sec-h">` → `<h2 className="qll-sec-h" data-pdf-heading>` (replace_all — 4 occurrences).
- `<p className="qll-summary" style={f("summary")}>` → `<p className="qll-summary" data-pdf-block style={f("summary")}>`.
- `<div className="qll-item" key={item.id}>` → `<div className="qll-item" data-pdf-block key={item.id}>` (replace_all — 2 occurrences).
- `<div className="qll-skill-row" key={g.id}>` → `<div className="qll-skill-row" data-pdf-block key={g.id}>`.

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm exec vitest run src/templates/markers.test.tsx`
Expected: PASS (5 tests: 4 templates + Atlas).

- [ ] **Step 8: Checkpoint**

Run the full suite to confirm no existing template/preview test regressed:
`pnpm test`
Expected: all green. Report; do not commit.

---

### Task 4: Wire the pre-pass into the PDF export

**Files:**
- Modify: `src/pdf/download.ts`

**Interfaces:**
- Consumes: `insertPageBreakSpacers`, `PageMetrics` (Tasks 1–2); the `data-pdf-*` markers (Task 3); `theme` and `PX` (already in `download.ts`).
- Produces: no new exports; `downloadResumePdf` signature unchanged.

- [ ] **Step 1: Add the import**

In `src/pdf/download.ts`, after the existing `import { theme } from "../theme/theme";` line, add:

```ts
import { insertPageBreakSpacers, type PageMetrics } from "./paginate";
```

- [ ] **Step 2: Run the pre-pass around `doc.html()`**

Replace this exact block in `renderResumeDoc`:

```ts
  const prevMinHeight = element.style.minHeight;
  element.style.minHeight = "0px";
  try {
    await doc.html(element, {
      x: 0,
      y: 0,
      // The page renders at true size (612pt = 816px wide) and the .resume-page's
      // own padding supplies the page margins, so map 816px straight to 612pt and
      // keep doc-level margins at 0.
      width: theme.page.width,
      windowWidth: Math.round(theme.page.width * PX),
      margin: 0,
      autoPaging: "text",
      fontFaces: pdfFontFacesFor(used),
    });
  } finally {
    element.style.minHeight = prevMinHeight;
  }
```

with:

```ts
  const prevMinHeight = element.style.minHeight;
  element.style.minHeight = "0px";

  // Block-aware page breaks: insert spacers so no keep-together block (a résumé
  // entry, a skill row, or a heading + its first item) straddles a page boundary,
  // and so pushed blocks land below a top margin with a bottom margin on the page
  // they left. No-op for single-page résumés and for templates without
  // [data-pdf-block] markers (e.g. Atlas). doc.html keeps margin:0 — margins are
  // realized by the spacers, which leaves full-bleed page-1 headers untouched.
  const metrics: PageMetrics = {
    pageH: theme.page.height * PX,
    mt: theme.page.marginTop * PX,
    mb: theme.page.marginTop * PX,
  };
  const removeSpacers = insertPageBreakSpacers(element, metrics);
  try {
    await doc.html(element, {
      x: 0,
      y: 0,
      // The page renders at true size (816px = 612pt wide) and the .resume-page's
      // own padding supplies the horizontal page margins, so map 816px straight to
      // 612pt and keep doc-level margins at 0.
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

- [ ] **Step 3: Type-check and run the full unit suite**

Run: `pnpm build`
Expected: `astro check` reports 0 errors; static build succeeds.

Run: `pnpm test`
Expected: all green (including `paginate.test.ts` and `markers.test.tsx`).

- [ ] **Step 4: Browser verification (source of truth for the PDF)**

Build and serve the production build, then exercise the download in a real browser (use the project's playwright-core + system-Chrome harness against the preview server):

```bash
pnpm build && pnpm preview   # serve dist/ — do NOT verify via pnpm dev
```

For a résumé edited to overflow one page, in EACH single-column template (Classic, Ledger, Meridian, Quill), download the PDF and inspect it:

```bash
node scripts/inspect-pdf.mjs resume.pdf   # expect VECTOR, 0 images
pdffonts resume.pdf                        # expect Inter / SourceSerif "emb yes ... uni yes"
pdftotext -layout resume.pdf -             # read the text to confirm break quality
```

Confirm, per template:
- A job title stays on the **same** page as its bullets (no split entry); a skill row is never split.
- No section heading is the last line of a page (heading moved with its first item).
- Page 2 content begins below a top margin (not flush to the top edge).
- The verdict is still **VECTOR** with 0 `/Image` and embedded fonts.

Then confirm **no regression**:
- A single-page résumé exports identically to `main` (no spacers inserted).
- **Atlas** exports identically to `main` — full-bleed sidebar still reaches the page edges; no spacer divs affect it.

- [ ] **Step 5: Checkpoint**

Full suite green, `pnpm build` clean, browser verification checklist satisfied. Report results; do not commit (user commits).

---

## Self-Review

**Spec coverage:**
- Block-aware pre-pass / spacer insertion → Tasks 1, 2, 4. ✓
- Keep-together units incl. heading-glue → `buildUnits` (Task 1) + markers (Task 3). ✓
- Straddle math + too-tall skip + margin reservation → `computeSpacers` (Task 1). ✓
- Four single-column templates via shared marker, Atlas excluded → Task 3 + no-op path (Task 2). ✓
- Margins realized by spacers, `doc.html` keeps `margin:0` → Task 4. ✓
- Zero regression for single-page & Atlas → no-op path (Task 2) + browser check (Task 4). ✓
- Testing (pure unit tests, jsdom DOM-half test with stubbed rects, marker tests, browser verification) → Tasks 1–4. ✓

**Placeholder scan:** none — every step shows the full code or exact edit string.

**Type consistency:** `FlowNode`, `UnitRect`, `PageMetrics`, `Spacer`, `buildUnits`, `computeSpacers`, `insertPageBreakSpacers` are named identically across the module, tests, and `download.ts` usage. `PageMetrics` fields (`pageH`, `mt`, `mb`) match between definition (Task 1), test metric `M` (Tasks 1–2), and the `metrics` object in `download.ts` (Task 4).
