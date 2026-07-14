# Preview Page-Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show, in the live preview, where the exported PDF breaks across pages — the on-screen sheet visibly reflows each keep-together block onto the next page below a "Page N" divider — without changing the exported PDF at all.

**Architecture:** A layout effect decorates the already-rendered live `<Preview>` `.resume-page` in place, reusing the PDF's own `buildUnits`/`computeSpacers` math (`src/pdf/paginate.ts`) to insert visible spacer+divider `<div>`s before straddling blocks, and removes them on cleanup — exactly the `download.ts` spacer pattern, left visible and re-run reactively. Only the visible-preview subtree is touched; the offscreen `.pdf-capture` copy (which the PDF is drawn from) is never involved, so the export is byte-for-byte unchanged.

**Tech Stack:** TypeScript, React, Astro, jsPDF (unchanged), Vitest + @testing-library/react, pnpm, Vite 8.

## Global Constraints

- Package manager is **pnpm**; test runner is **vitest**. Toolchain is on **vite@8** — never re-pin vite@5.
- **Commits are the user's responsibility** — do NOT run `git commit`. End each task at a green state (tests pass, `pnpm build` clean) and report; the user commits.
- The app is **fully client-side**; the PDF path is **browser-only**. `pnpm build && pnpm preview` is the source of truth for exported-PDF appearance (the Astro dev toolbar stays disabled).
- All theme measurements are in **PostScript points**; `PX = 96 / 72` converts pt→CSS px. The page is `theme.page.height = 792pt` tall, `theme.page.marginTop = 46pt`.
- **Zero export impact:** the exported PDF must be identical to today. Decoration nodes live only in the visible preview (`[data-preview-break]`), never in `.pdf-capture`.
- **Do not modify** `src/pdf/paginate.ts`, `src/pdf/download.ts`, or the `data-pdf-*` markers — reuse them.
- `pnpm build` runs `astro check` — it must report **0 type errors**. Test files are type-checked too; keep them well-typed.

---

### Task 1: The preview-break DOM function — `insertPreviewBreaks`

**Files:**
- Create: `src/preview/previewBreaks.ts`
- Test: `src/preview/previewBreaks.test.ts`

**Interfaces:**
- Consumes: `buildUnits`, `computeSpacers`, `FlowNode`, `PageMetrics` from `../pdf/paginate` (existing, unchanged).
- Produces: `function insertPreviewBreaks(root: HTMLElement, m: PageMetrics, scale: number): () => void` — inserts visible `<div data-preview-break class="page-break">` nodes (each a spacer of `spacer.height` px carrying a `.page-break-line` at `height − mt` px with a `.page-break-label` "Page N") before every straddling keep-together block in `root`, and returns a cleanup that removes them. No-op cleanup when `root` has no marked units.

- [ ] **Step 1: Write the failing tests**

Create `src/preview/previewBreaks.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/preview/previewBreaks.test.ts`
Expected: FAIL — `Failed to resolve import "./previewBreaks"` / `insertPreviewBreaks` not defined.

- [ ] **Step 3: Write the minimal implementation**

Create `src/preview/previewBreaks.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/preview/previewBreaks.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Checkpoint**

Run: `pnpm exec vitest run src/preview/previewBreaks.test.ts` → green. Do not commit (user commits). Report the green state.

---

### Task 2: Wire the dividers into the live preview + style them

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `src/App.test.tsx` (append one test)

**Interfaces:**
- Consumes: `insertPreviewBreaks` (Task 1); `PageMetrics` from `./pdf/paginate`; existing `theme`, `PX`, `pageRef`, `scale`, `template.preload()`.
- Produces: no new exports. The live preview now renders `[data-preview-break]` dividers whenever content overflows one page.

- [ ] **Step 1: Add the imports**

In `src/App.tsx`, after the existing `import { ImportDialog } from "./import/ImportDialog";` line, add:

```ts
import { insertPreviewBreaks } from "./preview/previewBreaks";
import type { PageMetrics } from "./pdf/paginate";
```

- [ ] **Step 2: Add a preview-ready signal**

React.lazy resolves the template chunk asynchronously with no dep change, so the pagination effect needs a signal that fires once the `.resume-page` is actually mounted. In `src/App.tsx`, right after the existing `const [notice, setNotice] = useState<string | null>(null);` line, add:

```ts
  // Flips (per template id) once the lazy Preview chunk is loaded, so the
  // pagination effect below re-runs when `.resume-page` is actually mounted.
  const [previewReady, setPreviewReady] = useState<string | null>(null);
```

Then, immediately after the existing auto-dismiss `useEffect` for `notice` (the block ending `}, [notice]);`), add:

```ts
  // Preload the template chunk so `.resume-page` is mounted synchronously on the
  // next render; that render flips `previewReady`, triggering the pagination pass.
  useEffect(() => {
    let cancelled = false;
    template.preload().then(() => {
      if (!cancelled) setPreviewReady(template.id);
    });
    return () => {
      cancelled = true;
    };
  }, [template]);
```

- [ ] **Step 3: Add the pagination layout effect**

In `src/App.tsx`, immediately after the capture export layout effect (the block ending `}, [capture]);`) and before `const handleDownload`, add:

```ts
  // Faithful page-break dividers in the LIVE preview. Mirrors download.ts's
  // spacer pass (same paginate.ts math) but leaves the dividers visible. Runs
  // only against the visible preview subtree; `.pdf-capture` is never touched,
  // so the exported PDF is byte-for-byte unchanged. `scale` is a dependency
  // because measurement reads scaled rects.
  useLayoutEffect(() => {
    const page = pageRef.current?.querySelector<HTMLElement>(".resume-page");
    if (!page) return;
    let cleanup = () => {};
    let cancelled = false;
    void (async () => {
      // Guard: jsdom has no FontFaceSet; resolve immediately there.
      await (document.fonts?.ready ?? Promise.resolve());
      if (cancelled || !page.isConnected) return;
      const metrics: PageMetrics = {
        pageH: theme.page.height * PX,
        mt: theme.page.marginTop * PX,
        mb: theme.page.marginTop * PX,
      };
      cleanup = insertPreviewBreaks(page, metrics, scale);
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [data, variant, fontOverrides, previewReady, scale]);
```

- [ ] **Step 4: Add the divider styles**

In `src/index.css`, after the `.page-scaler { … }` rule, add:

```css
/* Live-preview page-break dividers (decoration only; never in the exported PDF,
   which is drawn from the separate .pdf-capture copy). */
.page-break {
  position: relative;
  width: 100%;
}
.page-break-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1.5px dashed var(--panel-border);
  text-align: center;
}
.page-break-label {
  position: relative;
  top: -0.75em;
  display: inline-block;
  padding: 0 8px;
  background: var(--app-bg);
  color: var(--text-muted);
  font: 600 11px/1.4 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

- [ ] **Step 5: Append the App-level inertness test**

jsdom has no real layout (rects are zero → `computeSpacers` finds no straddle), so the feature is inert under test. Append this test inside the `describe("App", …)` block in `src/App.test.tsx`, before its closing `});`:

```tsx
  it("shows no page-break divider for the single-page sample and still exports the live page", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    expect(document.querySelectorAll("[data-preview-break]").length).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    expect(vi.mocked(downloadResumePdf).mock.calls[0][0]).toHaveClass("resume-page");
  });
```

- [ ] **Step 6: Type-check and run the full unit suite**

Run: `pnpm build`
Expected: `astro check` reports 0 errors; static build succeeds.

Run: `pnpm test`
Expected: all green (including `previewBreaks.test.ts` and the new App test; the 8 existing `.resume-page` assertions still pass because the live preview is unchanged and no dividers are inserted under jsdom).

- [ ] **Step 7: Checkpoint**

Full suite green, `pnpm build` clean. Report; do not commit.

---

### Task 3: Browser verification (preview matches the PDF; export unchanged)

**Files:** none (verification only).

**Interfaces:**
- Consumes: the running preview build + the Task 1–2 behavior.
- Produces: a confirmed match between the on-screen divider and the PDF break, and proof the PDF is unchanged and free of divider text.

- [ ] **Step 1: Build and serve the production build**

```bash
pnpm build && pnpm preview --port 4399 --host 127.0.0.1   # serve dist/ — do NOT verify via pnpm dev
```

(Use a scratch dir for artifacts. Install the driver only, no browser download, and launch system Chrome — per the project harness: `playwright-core` with `executablePath: "/usr/bin/google-chrome"`, `args: ["--no-sandbox"]`, `waitUntil: "domcontentloaded"` + a `waitForSelector`.)

- [ ] **Step 2: For each single-column template, import an overflowing resume and assert the on-screen split**

Drive the app at `http://127.0.0.1:4399/build/resume/<template>/` for `<template>` in `classic`, `ledger`, `meridian`, `quill`. Import a resume long enough to overflow one page (open **Import** → **Next: paste JSON** → fill the `Pasted JSON` textbox → **Import & replace**; a 5-experience / 7-skill-group resume overflows). Then in the page context assert:

```js
// At least one divider is shown, labelled for page 2.
const breaks = document.querySelectorAll("[data-preview-break]");
console.assert(breaks.length >= 1, "expected a page-break divider");
console.assert(
  [...document.querySelectorAll(".page-break-label")].some(n => n.textContent === "Page 2"),
  "expected a 'Page 2' label",
);
// The element immediately after the first divider is the block that starts page 2.
const firstAfter = breaks[0].nextElementSibling;   // a [data-pdf-block] or [data-pdf-heading]
console.log(document.querySelector('[data-testid="builder-title"]').textContent,
            "-> page2 starts at:", firstAfter?.textContent?.slice(0, 40));
```

- [ ] **Step 3: Download each PDF and confirm the split matches AND the PDF is unchanged**

Capture the download (`page.waitForEvent("download")` → `saveAs`) for each template, then:

```bash
node scripts/inspect-pdf.mjs resume.pdf     # expect VECTOR, 0 images (as before)
pdffonts resume.pdf                          # expect Inter / SourceSerif "emb yes ... uni yes"
pdftotext -layout resume.pdf -               # inspect the page-1/page-2 boundary
```

Confirm, per template:
- The block that starts page 2 in `pdftotext -layout` output is the **same** block shown immediately after the preview's "Page 2" divider (Step 2) — the preview matches the export.
- No entry, skill row, or heading is split at the boundary (same block-aware break as the page-break feature).
- **The divider text never leaks into the PDF:** `pdftotext resume.pdf - | grep -c "Page 2"` counts only genuine resume content (0 from the divider) — the `[data-preview-break]` nodes are preview-only and absent from `.pdf-capture`.
- The PDF is otherwise identical to a pre-feature export (same VECTOR verdict, page count, and text).

- [ ] **Step 4: Confirm the no-op cases**

- **Single-page resume** (the default sample, no import): the preview shows **no** `[data-preview-break]`; its PDF is one page, unchanged.
- **Atlas** (`/build/resume/atlas/`, overflowing import): the preview shows **no** `[data-preview-break]` (no `data-pdf-*` markers → no-op), and its PDF is unchanged.

- [ ] **Step 5: Checkpoint**

Full suite green, `pnpm build` clean, browser checklist satisfied (preview divider matches the PDF break; PDF unchanged and divider-free; single-page and Atlas show no dividers). Report results; do not commit (user commits).

---

## Self-Review

**Spec coverage:**
- Faithful in-place reflow with visible dividers → `insertPreviewBreaks` (Task 1) + wiring (Task 2). ✓
- Reuse of the exact PDF math (`buildUnits`/`computeSpacers`), no changes to `paginate.ts` → Task 1 imports only. ✓
- Always-on, appears only on overflow → pagination effect + `computeSpacers` returning `[]` otherwise (Tasks 1–2). ✓
- Atlas no-op (no markers) → early return in `insertPreviewBreaks` (Task 1) + browser check (Task 3). ✓
- Export byte-for-byte unchanged; dividers never in `.pdf-capture` → decoration only on the visible preview (Task 2) + `grep`/diff checks (Task 3). ✓
- "Page N" divider at the true page cut (`height − mt`) → Task 1 line offset + test. ✓
- Scale compensation for measurement → `scale` param + test (Task 1), `scale` dep (Task 2). ✓
- Lazy-preview timing (divider appears on first load / template switch) → `previewReady` signal (Task 2). ✓
- Testing: jsdom unit tests (Task 1), App inertness test (Task 2), browser verification (Task 3). ✓

**Placeholder scan:** none — every step shows the full code or exact edit.

**Type consistency:** `insertPreviewBreaks(root: HTMLElement, m: PageMetrics, scale: number): () => void` is named and typed identically in the module, its test, and the `App.tsx` call site. `PageMetrics` fields (`pageH`, `mt`, `mb`) match the paginate.ts definition and the `metrics` object built in `App.tsx` and in the test fixture `M`.
