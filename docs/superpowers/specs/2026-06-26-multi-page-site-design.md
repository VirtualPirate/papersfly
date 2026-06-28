# Design: papersfly — landing page, template gallery, and routed builder

**Date:** 2026-06-26
**Project:** `vector-resume-builder` (`/Users/artazasameen/workshop/pdf-mvp`)
**Status:** Approved design — ready for implementation plan

## Goal

Turn the single-screen tool (the builder lives at `/`) into a small website:

1. A **landing page** at `/` — the marketing front door, pitching "fully client-side:
   your documents never leave your browser," with a CTA to create a document.
2. A **document gallery** at `/create` — pick a document type, then see a card per
   template (with a live mini-preview); clicking a card opens the builder.
3. The existing **builder** moves to a real route, `/build/[doc]/[template]`.

Branding: the product is named **papersfly** (lowercase wordmark — confirm casing).
The site also ships **dark mode** across all pages.

## Non-goals (explicitly out of scope)

- **No new templates.** Only the existing `classic` résumé template ships. The gallery
  shows one real card plus a clearly non-functional dashed "more coming" placeholder.
- **No new document types.** Only `resume` is real. The doc-type picker shows the
  Résumé pill plus muted, non-clickable "Soon" pills (Cover letter, Invoice) purely to
  communicate the selector's purpose. Nothing is built behind them.
- No changes to the PDF generation pipeline, the schema-driven form, or `theme.ts`.
- No backend, no analytics, no auth (the product is client-only by design).

## Current state (what exists)

- Astro 5 static shell + a single React island. `src/pages/index.astro` mounts
  `<App client:only="react" />` — the builder: doc-type `<select>` in the header,
  schema form left, scaled live preview right, Download → true-vector PDF.
- Registries already model the flow as data:
  - `src/documents/registry.ts` → `documents = [resumeDocument]`, `defaultDocument`.
  - `src/templates/registry.ts` → `templates = [classicTemplate]`, `defaultTemplate`.
  - `DocumentType<T>` bundles `{ id, name, schema, defaultData, templates }`.
  - `Template` is `{ id, name, Preview (lazy), preload() }`.
- Styling layers: `index.css` (app shell vars `--app-bg` etc. + `.app`/`.editor`/
  `.preview`), `styles/globals.css` (shadcn tokens, **light only**, with a reset
  scoped to `.app` and explicitly excluding `.preview`/`.pdf-capture`), and
  `templates/classic/classic.css` (the résumé design, colored from `theme.ts` via
  `themeCssVars()` → `--c-ink`, `--c-accent`, … applied inline on `.resume-page`).

## Target architecture

### Routes

| Route | Purpose | Rendering |
|---|---|---|
| `/` (`index.astro`) | Landing / marketing | Static Astro. Near-zero JS. Hero shows a **real SSR-rendered `ClassicPreview`** as the showcase. |
| `/create` (`create.astro`) | Doc-type + template gallery | Static shell (crawlable heading) + `<CreateGallery client:only="react" />`. |
| `/build/[doc]/[template]` | The builder | `getStaticPaths()` over documents × templates; mounts `<App client:only="react" docId={…} templateId={…} />` + the existing skeleton. |

`getStaticPaths` enumerates only valid `(doc, template)` pairs, so unknown URLs are a
static 404. The sitemap integration picks up all new routes automatically.

### Navigation flow

`/` → click **"Create a document"** → `/create` → click a **template card** (a real
`<a href>`) → `/build/resume/classic`. The builder's header has a **"← Templates"**
back link to `/create`. Browser back/forward work naturally (real routes).

## Component & file plan

### New: pure helpers (written test-first)

- **`src/lib/routing.ts`**
  - `builderHref(docId, templateId): string` → `` `/build/${docId}/${templateId}` ``.
  - `buildBuilderPaths(documents): { doc: string; template: string }[]` → one entry per
    template of each document. Used by `getStaticPaths`.
  - Keeping these pure means routing is unit-tested, not just wired through `.astro`.
- **`src/lib/theme.ts`** — dark-mode helpers (see Dark mode section):
  `THEME_KEY`, `resolveInitialTheme(stored, prefersDark)`, `applyTheme(theme)`,
  `toggleTheme()`. The DOM-touching parts are thin; the resolution logic is pure/tested.

### New: site chrome (Astro components, shared by `/` and `/create`)

- **`src/components/site/SiteHeader.astro`** — nav: papersfly wordmark (+ doc mark) →
  `/`, links, a "Create a document" CTA → `/create`, and `<ThemeToggle />`.
- **`src/components/site/SiteFooter.astro`** — wordmark, "100% client-side" badge,
  free/open-source line.
- **`src/components/site/ThemeToggle.astro`** — a `<button>` + inline `<script>` for the
  **static** pages (`/`, `/create`). Flips `.dark` on `<html>` and persists to
  `localStorage`.
- **`src/components/site/ThemeToggle.tsx`** — the **React** equivalent for the builder
  island (an `.astro` component can't render inside a React island). A `<button>` whose
  `onClick` calls `toggleTheme()`. Both toggles share the same `lib/theme.ts` logic and
  operate on `document.documentElement` — only the markup wrapper differs.

### New: landing sections

- **`src/components/marketing/Hero.astro`** (or inlined in `index.astro`) — eyebrow,
  serif H1, lede, CTA row, trust microcopy, and the **showcase**: a real
  `<ClassicPreview data={sampleResume} />` rendered SSR (no client directive), scaled
  via a CSS `transform`, with the paper shadow and a "Stays on your device" chip.
  - Must ensure `classic.css` is loaded on this page. Rendering the component should
    pull it in; if Astro doesn't include it for an SSR-only framework component, add an
    explicit `import "../../templates/classic/classic.css"` in the page frontmatter.
- Trust section ("Your data never leaves your browser") — 3 cards: *Nothing is
  uploaded*, *No account, ever*, *Works offline* (lucide `lock`, `user-x`, `wifi-off`).
- How-it-works — 3 numbered steps (genuine sequence): choose template → fill form →
  download vector PDF.

### New: gallery island

- **`src/components/create/CreateGallery.tsx`** (`client:only="react"`)
  - State: `selectedDocId` (default `documents[0].id`).
  - Renders a pill per entry in `documents` (active = selected) plus the static
    `COMING_SOON_TYPES` muted "Soon" pills.
  - Below: for the selected document, a `TemplateCard` per `doc.templates`, plus the
    dashed "more templates coming" placeholder.
- **`src/components/create/TemplateCard.tsx`**
  - An `<a href={builderHref(docId, template.id)}>` wrapping a `.thumb` containing the
    **scaled live preview** (`<Suspense fallback={skeleton}><template.Preview
    data={doc.defaultData} /></Suspense>`, fixed `transform: scale()`, top-aligned,
    bottom fade) + meta (`template.name`, one-line description, hover "Use →").
  - Reuses the existing lazy `Preview` + `<Suspense>` pattern from `App.tsx`, so each
    template's chunk stays code-split.

### New: page files

- **`src/pages/create.astro`** — `BaseLayout` + `SiteHeader` + static crawlable intro
  + `<CreateGallery client:only="react" />` + a small skeleton.
- **`src/pages/build/[doc]/[template].astro`** — `getStaticPaths()` via
  `buildBuilderPaths(documents)`; reads `Astro.params`; renders the existing skeleton +
  `<App client:only="react" docId={doc} templateId={template} />`.

### New: styles

- **`src/styles/marketing.css`** — all landing + gallery styles, plus a reset scoped to
  the marketing root (`.site`) for `box-sizing`/`img`, **never** blanket margin resets
  (the hero contains a real `.resume-page`; explicit per-class margins keep the sheet
  pixel-identical to the live template). Light values reference shared CSS vars; dark
  values come from the `.dark` overrides below.

### Modified

- **`src/pages/index.astro`** — replace the builder mount with the landing page
  (`SiteHeader` + `Hero` + trust + how-it-works + `SiteFooter`). Keep SEO title/desc.
- **`src/App.tsx`**
  - New props: `App({ docId, templateId }: { docId: string; templateId: string })`.
  - `doc = documents.find(d => d.id === docId) ?? defaultDocument`;
    `template = doc.templates.find(t => t.id === templateId) ?? doc.templates[0]`.
  - `data` initial: `useState(() => doc.defaultData)`; `handleReset` → `doc.defaultData`.
  - Header: **remove** the doc-type `<Select>` and `handleDocChange`; add a
    **"← Templates"** link to `/create` + the active title (`{doc.name} · {template.name}`).
    Right side: `<ThemeToggle />` (the React one), Reset, Download. All PDF/scaling/
    capture logic is unchanged.
- **`src/App.test.tsx`** — pass `docId="resume" templateId="classic"` to every render;
  replace the "document-type selector" test with one asserting the back link
  (`href="/create"`) and the active template name, and the absence of the combobox.
  Keep the lazy-preview, error-alert, and preload-export tests.
- **`src/styles/globals.css`** — add a `.dark { … }` block with the standard shadcn dark
  tokens (drives Button/Select/Alert and any Tailwind utilities in the builder chrome).
- **`src/index.css`** — add `.dark` overrides for the app-shell vars (`--app-bg`,
  `--panel-bg`, `--panel-border`, `--text`, `--text-muted`, `--shadow`).
- **`src/layouts/BaseLayout.astro`** — add a tiny **no-flash** inline script in `<head>`
  that sets `.dark` on `<html>` from `localStorage`/`prefers-color-scheme` before paint.

## Dark mode

- Mechanism: a `.dark` class on `<html>`; all themes are CSS-variable swaps.
- Three token sources, each gets a dark variant: `globals.css` (shadcn),
  `index.css` (app shell), `marketing.css` (site). One toggle controls all.
- No-flash: inline `<head>` script resolves the theme and sets the class before first
  paint. `ThemeToggle` flips + persists; default follows `prefers-color-scheme`.
- **Hard invariant — the document stays white paper in every theme.** Dark rules must
  never target `.resume-page`, `.preview *`, or `.pdf-capture *`. The sheet is colored
  from `theme.ts` via `--c-*` (a separate namespace from `--background`/`--foreground`),
  so it is already theme-independent — keep it that way. The `.preview` **pane**
  background may go dark (the white sheet floats on it); the sheet itself does not.
- **PDF safety:** `doc.html()` (html2canvas) clones the whole document on export. Because
  no dark rule touches the capture subtree and the sheet's colors are fixed, the exported
  PDF is byte-for-byte unaffected by the active theme. (Also preserve the existing
  invariant: Astro dev toolbar stays disabled.)

## Testing strategy (TDD)

- `src/lib/routing.test.ts` — `builderHref` formatting; `buildBuilderPaths` over a fake
  multi-doc/multi-template `documents` array (count + shape).
- `src/lib/theme.test.ts` — `resolveInitialTheme` truth table (stored value wins; else
  `prefersDark`); toggle flips and persists (mocked `localStorage`/`matchMedia`).
- `src/components/create/TemplateCard.test.tsx` — renders the template name and an anchor
  whose `href` equals `builderHref(...)`; renders the preview behind `<Suspense>`.
- `src/components/create/CreateGallery.test.tsx` — one pill per document; one card per
  template of the selected doc; selecting a different doc swaps the cards (drive with a
  fake multi-doc registry if needed). Asserts the real card links to `/build/resume/classic`.
- `src/App.test.tsx` — updated as above.
- Build verification: `pnpm build` (runs `astro check`), then `pnpm preview` is the
  source of truth for the actual exported PDF.

## Open questions / confirmations

- **Wordmark casing:** ship as `papersfly` (lowercase) unless you prefer `Papersfly`.
- **Hero headline copy:** demo uses "Beautiful documents that never leave your browser."
  — adjust freely.
- `astro.config.mjs` `SITE` is still the `https://example.com` placeholder; unrelated to
  this work but worth setting before a real deploy.

## Reference

Visual demo (real tokens, real fonts, light + dark, both pages):
https://claude.ai/code/artifact/196bf572-257c-4209-b79a-d4e67032a485
