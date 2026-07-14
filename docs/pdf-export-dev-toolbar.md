# Gotcha: the Astro dev toolbar breaks PDF export in `astro dev`

**Status:** Resolved · **Date:** 2026-06-25 · **Area:** PDF export (`src/pdf/download.ts`), dev config (`astro.config.mjs`)

## TL;DR

In `pnpm run dev`, the exported resume PDF rendered the header **horizontally** (name,
headline, and contact line as three side-by-side columns) instead of **stacked
vertically**. The production build (`pnpm build && pnpm preview`) was always correct.

**Root cause:** the **Astro dev toolbar**, injected only in `astro dev`, adds extra
DOM and `<style>` tags to the page. jsPDF's `doc.html()` runs **html2canvas**, which
clones the *entire document* to render — and that dev-only injected markup corrupted
html2canvas's layout computation.

**Fix:** disable the dev toolbar in `astro.config.mjs`:

```js
devToolbar: { enabled: false },
```

No resume template, CSS, or PDF-pipeline code was changed.

## Symptom

The header block in the exported PDF:

```
Jordan Avery Chen   SENIOR SOFTWARE ENGINEER   jordan.chen@example.com · (415) 555-0148 · …
```

— three columns side by side, with the name wrapping to three lines in a narrow left
column. It should be top-to-bottom:

```
Jordan Avery Chen
SENIOR SOFTWARE ENGINEER
jordan.chen@example.com · (415) 555-0148 · San Francisco, CA · jordanchen.dev · …
```

The **on-screen preview was correct (vertical) in both dev and production** — only the
PDF generated from `astro dev` was wrong.

## How it was diagnosed

PDF text positions extracted from the actual generated files (page is 612×792 pt):

| Block      | Production PDF | Dev PDF (broken) |
| ---------- | -------------- | ---------------- |
| Name       | x=56, y=68     | **x=56** (left column) |
| Headline   | x=56, y=87     | **x=185** (middle column) |
| Contact    | x=56, y=106    | **x=281** (right column) |

Production: all at `x=56`, increasing `y` → stacked. Dev: three distinct `x` → columns.

Instrumenting html2canvas's internal clone (via its `onclone` hook) during a real dev
export showed the **cloned DOM was laid out correctly** — the capture's name/headline/
contact all computed as `display: block`, `position: static`, full width, stacked
(`y` = 61 → 102 → 128). So the CSS and markup were correct; html2canvas mis-rendered
that correct clone **only** because of the dev environment, which had **45 injected
`<style>` tags** (Vite per-module CSS + the Astro dev toolbar) versus production's single
bundled stylesheet. Disabling the dev toolbar dropped that to 4 and fixed the export.

## Why it looked like a migration regression

The migration moved the app onto Astro. Astro's dev server injects the dev toolbar and a
different CSS/DOM environment than the previous plain-Vite dev server, which is what
html2canvas trips on. The migrated **code** is correct — the production build proves it.

## General rule

`doc.html()` / html2canvas clones the **whole document**, so **any dev-only DOM injected
into the page can affect the exported PDF**. If a PDF looks wrong in `pnpm dev`:

1. Check for dev-only injected DOM/CSS (dev toolbars, browser-extension overlays, HMR
   widgets) first.
2. Treat **`pnpm build && pnpm preview`** as the source of truth for what the exported
   PDF actually looks like — that's the artifact users get.

## Related

- Fix + rationale: the `devToolbar: { enabled: false }` comment in
  [`astro.config.mjs`](../astro.config.mjs).
- A `optimizeDeps.include` entry for `jspdf` in the same file is unrelated to this bug —
  it just stops the first dev **Download** click from triggering a full page reload.
