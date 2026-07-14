# Design: Four new resume templates (Meridian, Quill, Ledger, Atlas)

Date: 2026-07-08
Status: Approved (designs) — awaiting spec review

## Goal

Add four structurally distinct resume layouts to the builder, each fully wired
into the existing **variants** system (color schemes + font pairings) with a
sensible per-template default. The current single design (Classic) becomes one
of five. Content (`ResumeData`) and the PDF-export path are unchanged in spirit;
only new designs are added.

Design directions were reviewed and approved via an artifact mockup gallery. The
approved set:

| Name | Layout | Register | PDF export |
|------|--------|----------|-----------|
| **Meridian** | Modern header band — full-bleed accent header block, single column below | Design-forward | Safe (single column) |
| **Quill** | Minimalist / centered — centered header, hairline rules, restrained color | Conservative | Safe (single column) |
| **Ledger** | Compact / dense — tight rhythm, tabular dates, packs a senior resume on one page | Conservative / ATS | Safe (single column) |
| **Atlas** | Two-column sidebar — tinted left rail (contact / skills / education), main column for summary + experience | Design-forward | **Needs export verification** |

## Background & hard constraints (do not violate)

These come from `CLAUDE.md`, `theme.ts`, `variants.ts`, and the export path in
`pdf/download.ts` + `App.tsx`. Every new template must respect them:

1. **The rendered DOM is the PDF source.** `doc.html()` walks the live preview
   DOM and emits vector text. There is no separate PDF layout. Author the design
   once as HTML/CSS.
2. **Author sizes in `pt`.** The page renders at true physical size (612 × 792
   pt). Reuse the `theme.ts` CSS custom properties (`--s-*`, `--sp-*`,
   `--margin-*`, `--c-*`, `--f-*`) for shared rhythm; express template-specific
   deviations as literal `pt` values (or local var overrides) in the template's
   own CSS. **Do not** use `cqi`/container-query fluid sizing (the mockup used it
   for the browser gallery; the real preview is a fixed-width page scaled by a
   parent transform).
3. **Root element must carry class `.resume-page`.** The export queries
   `.resume-page` on the offscreen capture copy; a template without it silently
   no-ops the export.
4. **The name element must carry class `.resume-name`.** `download.ts` reads its
   `textContent` for the PDF title/author metadata.
5. **Root must set `min-height: var(--page-h)`.** `download.ts` neutralizes this
   inline to `0` during capture so a one-page resume doesn't spill a trailing
   blank page. Any full-height visual (e.g. Atlas's sidebar tint) must therefore
   reach the bottom via layout stretch, not via a fixed page height (see Atlas).
6. **All text renders through the variant font slots.** Use `var(--f-serif)`
   (display/name slot) and `var(--f-sans)` (body/headings slot), plus the
   per-field `fontOverrides` mechanism. **Never hardcode a `font-family`** — the
   PDF embeds exactly the fonts named by `resolveVariantFontIds(variant)`, so a
   hardcoded family that isn't in the active pairing falls back to Helvetica in
   the PDF and breaks offline. Accent color comes from `var(--c-accent)`.
7. **Single-page output only.** Pagination is coarse; design each template to fit
   the sample resume on one page.

## How variants flow (why "proper variants" is mostly free)

`App.tsx` renders `<Preview data fontOverrides variant />` and the template calls
`themeCssVars(resolveVariant(variant))` on its `.resume-page` root. That resolves
the selected **color scheme** → `--c-accent` and the selected **font pairing** →
`--f-serif` (display) + `--f-sans` (body). The PDF embeds
`resolveVariantFontIds(variant)`. So a template that obeys constraint #6 gets the
full colors × fonts matrix and correct PDF font embedding with **no per-template
export code**. "Proper variants" therefore means: (a) obey #6, and (b) declare
each template's offered `colors` / `fonts` / `default` in its `meta.variants`.

### Per-template variant plan

All four offer the full `COLOR_SCHEMES` (navy, charcoal, burgundy, forest). Font
offerings and defaults are chosen to suit each design:

| Template | Fonts offered | Default variant | Rationale |
|----------|---------------|-----------------|-----------|
| Meridian | all 4 pairings | `navy` + `classic` | Serif name on a navy band; accent drives the header block. |
| Quill | all 4 pairings | `charcoal` + `editorial` | Playfair Display, centered, reads as premium/editorial; charcoal is restrained. |
| Ledger | all 4 pairings (incl. `mono`) | `charcoal` + `classic` | Subdued/technical; `mono` pairing available for a full tabular look. |
| Atlas | all 4 pairings | `navy` + `modern` | IBM Plex Sans in a sidebar reads as a modern CV. |

`Classic` is unchanged (`navy` + `classic`).

## Per-template design detail

Shared resume components (name, headline, contact, section headings, experience/
education items, bullets, skill rows) follow Classic's structure and class
conventions where possible; each template restyles them. All reuse `theme.ts`
rhythm vars as the baseline.

### 1 · Meridian — modern header band (design-forward, export-safe)

- `.resume-page` padding is `0`; a full-bleed **header band** (`background:
  var(--c-accent)`, white text) spans edge-to-edge and holds the name (serif,
  large), the uppercase tracked headline (light accent tint), and the contact row
  (light tint, `·` separators).
- Below the band, a **body wrapper** carries the normal side/vertical page
  margins (`--margin-x`, etc.) and holds the sections.
- Section headings: uppercase, `--c-accent`, hairline bottom rule (Classic-like).
- Body items reuse Classic's structure verbatim.
- Distinctive element: the colored header block. Everything else stays quiet.

### 2 · Quill — minimalist / centered (conservative, export-safe)

- Centered header: name (serif), headline in wide-tracked uppercase muted, contact
  centered with `·` separators. A single hairline rule under the header.
- Body left-aligned (centered body hurts scannability). Section headings are
  left-aligned small uppercase labels with a hairline rule filling the rest of the
  line (`::after` flex rule).
- Restrained color: accent used sparingly; bullets and org text sit in muted/faint
  greys rather than accent, for a premium quiet feel.

### 3 · Ledger — compact / dense (conservative / ATS, export-safe)

- Header: name left; contact stacked on the right, right-aligned, small. A thick
  `2pt` accent rule under the whole header.
- Denser type scale and tighter vertical rhythm than Classic (smaller local `pt`
  sizes / gaps) so a full senior resume fits comfortably on one page with all
  three roles and their bullets.
- Experience items render role + company on one line (`role` bold, company inline
  in accent) with the date pushed right.
- **Dates use `font-variant-numeric: tabular-nums`** with the body font for column
  alignment — *not* a hardcoded mono face (see constraint #6). Users who want the
  full mono look select the existing `mono` font pairing from this template's
  variants.
- Skills use a tighter label column.

### 4 · Atlas — two-column sidebar (design-forward, export-verification required)

- `.resume-page` is a CSS grid: `grid-template-columns: <sidebar> 1fr` (sidebar
  ≈ 34–36% of page width, in `pt`).
- **Sidebar** (`--c-accent-soft` tint background, right hairline border): name
  (serif, accent), headline, then Contact, Skills, Education blocks.
- **Main column**: Summary + Experience.
- Grid uses default `align-items: stretch`, so both columns stretch to the row
  height (= the taller column). Because `download.ts` sets `min-height: 0` during
  capture, the captured page is exactly content-tall and the sidebar tint stretches
  to that same content bottom — no white gap below the tint. **This must be
  verified in a real exported PDF, not assumed** (see Verification gate).
- New theme token required: `--c-accent-soft`, a light tint derived from the
  resolved accent (accent mixed toward white in `themeCssVars`). A plain
  hex/rgb value (html2canvas-safe) rather than CSS `color-mix()` (which the
  export's html2canvas layer may not parse).

## Architecture & files to add/change

### New shared: resume schema extraction (targeted refactor)

All resume templates edit the same `ResumeData`, so they share one editor schema.
Today it lives in `src/templates/classic/schema.ts`. Extract it to a
document-level home so no template owns another's schema:

- **Add** `src/documents/resume/schema.ts` — move `resumeSchema` +
  `makeBlank*` helpers here (verbatim).
- **Update** `src/templates/classic/index.ts` to import `resumeSchema` from the
  new location; do the same for the four new templates.
- **Move/relocate** the schema test (`classic/schema.test.tsx`) accordingly (it
  exercises the schema-driven form, which is template-independent). Keep coverage
  equivalent.

### New theme token

- **`src/theme/theme.ts`** — `themeCssVars()` additionally emits
  `--c-accent-soft`, computed from the resolved accent (a small hex-mix helper
  toward white, ~7–8%). Backward compatible; Classic ignores it. Covered by a
  unit test in `theme.test.ts`.

### New templates (one folder each under `src/templates/`)

For `meridian`, `quill`, `ledger`, `atlas`, each folder contains:

- `<Name>Preview.tsx` — default export; renders `.resume-page` (with
  `themeCssVars(resolveVariant(variant))`), `.resume-name`, and the sections;
  applies `fontStyleFor(fontOverrides, path)` per field exactly like Classic.
- `<name>.css` — side-effect imported by the Preview (its own build chunk).
- `index.ts` — `lazyTemplate({ id, name, description, schema, variants }, () =>
  import("./<Name>Preview"))`, importing `resumeSchema` and the appropriate
  `COLOR_SCHEMES` / curated fonts / per-template `default` variant.
- Tests mirroring Classic's (`<Name>Preview.test.tsx`, `index.test.tsx`).

### Registry & UI wiring

- **`src/templates/registry.ts`** — add the four templates to the `templates`
  array.
- **`src/documents/resume/index.ts`** — add the four to `resumeDocument.templates`
  (order = gallery order; Classic first, then the four).
- **Routing**: `/build/[doc]/[template]` uses `buildBuilderPaths` (getStaticPaths)
  and the `/create` gallery maps over `doc.templates` — both pick up the new
  templates automatically once registered. **No route code changes.**
- **`src/components/create/TemplateCard.tsx`** (small enhancement): pass
  `variant={template.variants.default}` to the thumbnail `<Preview>` so each
  gallery card previews in its intended default variant instead of the global
  `DEFAULT_VARIANT`. Makes the four visibly distinct in the gallery.

## PDF export considerations & the Atlas verification gate

Meridian, Quill, and Ledger are single-column and low-risk; a normal
`pnpm build && pnpm preview` + download + `pdftotext`/`pdffonts` check confirms
them.

**Atlas is the risk.** Per `CLAUDE.md`, multi-column is the most fragile thing for
`doc.html()`. Before Atlas is considered done, verify against `pnpm preview` (the
source of truth, not `pnpm dev`):

1. Columns render side-by-side in the **exported PDF** (not stacked/overlapping).
2. Sidebar tint reaches the content bottom (no white gap; stretch works).
3. `pdftotext resume.pdf -` returns readable, correctly-ordered text (sidebar and
   main content both present, not interleaved into gibberish).
4. `pdffonts` shows the variant's fonts embedded (`emb yes`), no Helvetica
   fallback.
5. `node scripts/inspect-pdf.mjs resume.pdf` reports a VECTOR verdict with zero
   images.

If Atlas fails export verification and can't be made to pass with reasonable
layout adjustments, we fall back to shipping Meridian/Quill/Ledger and document
Atlas as preview-only or dropped — rather than shipping a broken PDF. This gate is
part of the definition of done.

## Testing plan

- **Per template**: a Preview test (renders `.resume-page` + `.resume-name`;
  renders all sections from `sampleResume`; gracefully omits empty
  summary/contact/sections like Classic's test) and an index/meta test (id, name,
  description, schema identity, `variants.default` valid, `preload()` resolves to
  a component).
- **Theme**: `theme.test.ts` asserts `themeCssVars` emits `--c-accent-soft` and
  that it derives from the accent override.
- **Schema**: relocated schema test keeps its current assertions.
- **Registry**: existing `documents/registry.test.ts` (`toBeGreaterThan(0)`) still
  passes; optionally add an assertion that all resume templates expose non-empty
  `variants.colors`/`variants.fonts` and a `default`.
- **Full suite + type-check**: `pnpm build` (astro check) and `pnpm test` green.
- **Manual PDF verification** for all four (the Atlas gate above is mandatory).

## Non-goals / out of scope

- No changes to `ResumeData` or the form fields.
- No new fonts or color schemes beyond what `library.ts` / `variants.ts` already
  provide (the four pairings + four colors are reused).
- No multi-page support work.
- No new document kinds (resume only).
- Template names (Meridian / Quill / Ledger / Atlas) are proposals; renaming is a
  cheap change if desired during spec review.

## Open questions

- Confirm the four template **names** (or rename).
- Confirm gallery **order** (proposed: Classic, Meridian, Quill, Ledger, Atlas).
