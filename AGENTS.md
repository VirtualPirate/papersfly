# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## What this is

A fully **client-side** document/résumé builder (Astro + React, package name `vector-resume-builder`).
The user fills a form, sees a live HTML/CSS preview, and clicks Download to get a **true-vector PDF**
(selectable text + embedded fonts) generated entirely in the browser — **no backend, no network call,
works offline after first load**. There is intentionally no server runtime and no headless PDF path.

## Commands

```bash
pnpm install
pnpm dev              # astro dev server (use this for local work)
pnpm build            # astro check (type-check) + static build into dist/
pnpm preview          # serve the production build — SOURCE OF TRUTH for PDF output (see gotcha below)

pnpm test             # vitest run (one shot)
pnpm test:watch       # vitest watch
pnpm exec vitest run src/forms/schema.test.ts   # run a single test file
pnpm exec vitest run -t "substring of test name" # run tests matching a name

pnpm gen:fonts        # regenerate src/fonts/fontData.ts (base64) from the TTFs — run if a TTF changes
pnpm gen:og           # regenerate public/og-image.png
```

Package manager is **pnpm** (single-package repo; `pnpm-workspace.yaml` lists no sub-packages).

## The core idea (read this before touching the PDF or template code)

The design is authored **exactly once** as HTML/CSS, and the *same rendered DOM* is both the on-screen
preview and the source the PDF is drawn from. There is no second, hand-mapped PDF layout to keep in sync.

- Every measurement (page size, margins, font sizes, leading, gaps) lives in `src/theme/theme.ts` in
  **PostScript points (pt)**, exposed as CSS custom properties via `themeCssVars()`. The page renders at
  true physical size (612pt × 792pt = US Letter), so screen and PDF geometry are identical.
- On download, `src/pdf/download.ts` hands the rendered DOM to **jsPDF's `doc.html()`**, which emits
  native selectable vector text per element and embeds the TTFs. It is **not** a screenshot — verified by
  text-show operators and zero `/Image` in the output. (jsPDF *does* run html2canvas internally, but as
  its layout engine drawing through a vector `context2d`, not onto a raster canvas.)

## Architecture & data flow

```
Astro static shell (src/pages/index.astro, src/layouts/BaseLayout.astro)
  └─ renders SEO <head> + JSON-LD + a skeleton, then mounts <App client:only="react" />
     (all app logic is browser-only; Astro renders no application logic on the server)

src/App.tsx                    Top-level React island: doc-type <select>, schema-driven editor,
                               scaled live preview, offscreen capture copy, font-coverage warning.

Three decoupled layers:
  1. DATA      src/data/resume.ts          ResumeData types + sample content. Content only, no design.
  2. SCHEMA    src/forms/ + src/documents/ Type-safe form schema → auto-generated editor.
  3. DESIGN    src/templates/              Hand-authored HTML/CSS preview(s) = the PDF source.

src/documents/                 A DocumentType bundles { schema, defaultData, templates } for one doc kind.
  types.ts                     The DocumentType<T> interface.
  registry.ts                  `documents` list — add a doc kind here. `defaultDocument` is documents[0].
  resume/{index,schema}.ts     The résumé document: ResumeData + its FormSchema + classicTemplate.

src/forms/                     Schema-driven editor (replaces the old hand-written EditorForm).
  schema.ts                    `builder<T>()` produces a type-checked FormSchema (section/list/group/
                               row/field/textarea/lines/tags). Node shapes are non-generic; all key
                               safety lives in the builder's generics — write `builder<MyData>()`.
  SchemaForm.tsx               Renders a FormSchema into controlled inputs; emits new immutable data.
  update.ts                    Immutability + id helpers (setKey/addItem/updateItem/removeItem, newId).

src/templates/                 Each template is one design over ResumeData.
  types.ts                     Template = { id, name, Preview (lazy), preload() }.
  lazyTemplate.ts              Wires a template to its OWN build chunk via a bare dynamic import.
  registry.ts                  `templates` list (parallel to documents; documents reference templates).
  classic/                     ClassicPreview.tsx + classic.css — the one shipped design.

src/fonts/                     Inter (400/600) + Source Serif 4 (700), subset to Latin, OFL-licensed.
  fontData.ts                  AUTO-GENERATED base64 of the TTFs (do not hand-edit; run gen:fonts).
  registerFonts.ts             Embeds fonts into jsPDF + builds the doc.html() fontFaces map.
  fonts.css                    @font-face for the preview (same TTFs as the PDF).
  coverage.ts                  Scans content for glyphs the subset can't render → warning bar.
```

**Data flow:** editing the form produces a *new immutable* data object → re-renders the preview live →
that same markup is what the PDF captures. Switching doc type loads that type's `defaultData`.

## Non-obvious invariants & gotchas

- **The Astro dev toolbar MUST stay disabled** (`devToolbar: { enabled: false }` in `astro.config.mjs`).
  It injects DOM/`<style>` that html2canvas clones, which corrupts the exported PDF header (name/headline/
  contact render as side-by-side columns instead of stacked). Full writeup: `docs/pdf-export-dev-toolbar.md`.
  Corollary: **PDF generation is browser-only and dev-environment-sensitive — treat `pnpm build && pnpm
  preview` as the source of truth for what the exported PDF actually looks like**, not `pnpm dev`.

- **Offscreen capture copy.** `doc.html()` reads layout from an untransformed, laid-out DOM, but the
  visible preview is wrapped in `transform: scale()` to fit the screen. So `App.tsx` mounts a *hidden,
  true-size* copy only during download, fed a **frozen** data snapshot and the **preloaded concrete**
  (non-lazy) component — a still-suspended lazy component would yield no `.resume-page` and silently
  no-op the export. `download.ts` also neutralizes the preview's `min-height` inline on the captured node
  so a one-page résumé doesn't spill a trailing blank page.

- **Font registration invariant** (`registerFonts.ts`): each font's `file` name is simultaneously the
  jsPDF VFS key AND the `pdfFontFaces` `src.url`. They must stay equal — a mismatch makes jsPDF attempt a
  (failing, offline-breaking) network fetch and fall back to Helvetica.

- **Lazy templates.** Adding a template = a folder with a Preview component + one
  `lazyTemplate(meta, () => import("./Thing"))`. The bare dynamic import is what puts the component (and
  its CSS) in a separate chunk, so the entry bundle doesn't grow per template.

- **Pagination is coarse.** `doc.html()` paginates with `autoPaging: "text"` and margins come from the
  template's own padding applied once around the whole block. Only single-page output is fully supported;
  multi-page is degraded (intermediate page breaks lose margins). See README "Notes & limitations".

- **Production domain** is a single `SITE` constant in `astro.config.mjs` (currently the placeholder
  `https://example.com`). Canonical/OG URLs, sitemap, and robots.txt all derive from it.

## Adding things

- **New design (template):** new folder under `src/templates/`, export a `Template` via `lazyTemplate`,
  register in `src/templates/registry.ts`, and attach it to a document's `templates`. Content never changes.
- **New document kind:** new data interface + a `builder<T>()` schema + a template, then append a
  `DocumentType` to `src/documents/registry.ts`. The editor form is generated for free from the schema.

## Verifying an exported PDF

Generation is browser-only, so it cannot run in vitest — but `pnpm verify:pdf`
drives a real headless browser end to end: it builds, exports every template ×
font pairing, and strict-inspects each (fails on any raster or non-embedded
fallback font). This is the automated gate (also run in CI). For a single
downloaded PDF:

```bash
pdffonts resume.pdf                        # expect Inter/SourceSerif "emb yes ... uni yes"
pdftotext resume.pdf -                     # prints real selectable text (proves not an image)
node scripts/inspect-pdf.mjs resume.pdf --strict   # forensic VECTOR/RASTER verdict; --strict fails on fallback fonts
```
