# Templates — authoring guide

Guidance for coding agents when adding or editing templates. Read the **root
`AGENTS.md`** first for the big picture (client-side, true-vector PDF via
`doc.html()`, geometry in points). This file is the practical how-to for this
folder.

## Layout

```
src/templates/
  types.ts          Template<T> + TemplateVariants interfaces        (shared)
  lazyTemplate.ts   lazyTemplate<T>(meta, load) — wires a code-split chunk (shared)
  resume/           the resume designs (one folder per template) + registry.ts
  invoice/          variants.ts (per-template palettes) + the invoice designs
  cover-letter/     variants.ts (per-template palettes) + the cover-letter designs
```

A **template** is one *design* over a document's data type `T`. Designs are
grouped by document type: resume designs live in `resume/`, invoice designs in
`invoice/`. `types.ts` and `lazyTemplate.ts` are shared by every document type —
do not move them into a subfolder.

The same rendered DOM is BOTH the on-screen preview AND the source the PDF is
drawn from. You author the design once; there is no separate PDF layout.

## The `Template<T>` contract (`types.ts`)

```ts
interface Template<T = ResumeData> {
  id: string;                 // URL slug, e.g. "nordic"; unique within a doc type
  name: string;               // gallery label, e.g. "Nordic"
  description?: string;       // one-line gallery subtitle
  schema: FormSchema<T>;      // the editor form (usually shared across a doc type)
  variants: TemplateVariants; // color + font choices, and the default selection
  Preview: ComponentType<{ data: T; fontOverrides?; variant? }>;  // lazy
  preload: () => Promise<...>; // resolves the chunk to the concrete component
}
```

`Preview`/`preload` are produced by `lazyTemplate<T>(meta, () => import("./XPreview"))`
— never construct a `Template` by hand. The bare dynamic import is what puts the
component **and its CSS** in a separate build chunk, so the entry bundle does not
grow per template.

## Page-break markers — required on every template

The live preview shows a dashed **"Page N" divider** wherever the exported PDF
will break across pages, and the PDF export keeps those same blocks intact — no
resume entry, **invoice line-item row**, or totals box is ever split across a
page boundary. Both behaviors are driven by two `data-*` attributes you put on
the design's repeating / keep-together content. **Every template must carry them
so the divider shows on it** (a template with none shows no divider and its PDF
slices content mid-block):

- **`data-pdf-block`** — a keep-together unit that must never straddle a page
  boundary: a resume entry / skill row, an **invoice line-item row**, the totals
  box, the footer. Put it on each repeating row and each closing block.
- **`data-pdf-heading`** *(optional)* — a section title that must stay with the
  first `data-pdf-block` that follows it (resume section headings use this).
  Omit it where there is no such title — the invoices don't use it.

Mechanics: `src/pdf/paginate.ts` measures these blocks and inserts a spacer
before any that would straddle a page (pushing it below the next page's top
margin); `src/preview/previewBreaks.ts` runs the identical math but leaves a
visible divider. You only annotate the markup — no per-template wiring.

- **Table-based item lists** (Bureau, Sterling render items as `<table>`): put
  `data-pdf-block` on each `<tbody>` `<tr>`. The spacer is emitted as a `<tr>`
  automatically (a `<div>` sibling would be an invalid table child and render
  outside the row flow) — mark the row and nothing else.
- **The one exception is Atlas** (the two-column resume), left intentionally
  unmarked: a full-width spacer cannot be inserted into a two-column flow, so it
  shows no divider until the pre-pass grows column awareness. Any other new
  single-column template must be marked.
- **Never pin content to the page bottom** (`position: absolute; bottom: …`,
  as the cover-letter Carbon's contact rail first tried): (a) if marked, the
  pre-pass sees it straddling the boundary and shows a phantom "Page 2"
  divider; (b) worse, `pdf/download.ts` neutralizes the page's `min-height` at
  capture, so bottom-pinned content collapses upward in the exported PDF and
  the preview/PDF stop matching. Keep footers in normal flow.

## Add a new DESIGN to an existing document type

Create a folder `src/templates/<docType>/<name>/` with five files. Copy an
existing sibling (e.g. `invoice/nordic/`) and adapt.

1. **`<Name>Preview.tsx`** — the design. Rules (all four invoice templates follow
   these; keep them consistent):
   - Root element: `<div className="resume-page t-<name>" style={themeCssVars(resolveVariant(variant, <DOCTYPE>_VARIANTS.colors))}>`.
     - `.resume-page` is the load-bearing PDF **capture-root class**
       (`App.tsx` and `pdf/download.ts` query it). Every template's root must
       carry it. **Do not rename it.**
     - Pass the template's own `variants.colors` to `resolveVariant` when the
       palette is NOT the global `COLOR_SCHEMES` (see Variants below).
   - Font-override hook: `const f = (p) => fontStyleFor(fontOverrides, p);` and
     apply `style={f("path")}` to the fields users can restyle per-field
     (title/name, party names, line-item descriptions). `joinPath` takes exactly
     two args, so nest it for deeper paths:
     `joinPath(joinPath("items", item.id), "description")`.
   - **Empty-field guards**: hide optional content when blank (e.g.
     `{data.poNumber && (...)}`, `{totals.discount > 0 && (...)}`). Render
     computed money via a helper, never inline arithmetic.
   - **Page-break markers**: tag each keep-together block with `data-pdf-block`
     (line-item rows, totals, footer) — on `<tr>` for table item lists — so the
     preview page divider appears and the PDF never splits a block. Required on
     every template; see **Page-break markers** above.
   - Default-export the component (`export default NordicPreview`).

2. **`<name>.css`** — the design's CSS, **self-contained** and scoped under
   `.resume-page.t-<name>` (each chunk loads alone, so you cannot rely on another
   template's base rule). The root rule MUST set its own box:
   `width: var(--page-w); min-height: var(--page-h); box-sizing: border-box;
   background: #fff; color: var(--c-ink); font-family: var(--f-sans);`.
   - **Geometry in points.** The page is `612pt × 792pt` (US Letter). Author
     lengths in `pt`. (When porting a fixed-width HTML mock of width *W*px, a
     handy conversion is `px × (612 / W)` → pt.)
   - **Font slots — apply consistently.** `themeCssVars` exposes two font slots:
     `--f-serif` = the pairing's *display* face, `--f-sans` = its *body* face.
     Route the template's ONE signature element (the big title / wordmark /
     masthead name) to `var(--f-serif)` and everything else to `var(--f-sans)`.
     If you send all text through `--f-sans`, switching the font pairing only
     changes the body and the display face is silently ignored — a real bug we
     hit. The resume name (`.resume-name`) is the reference: it uses `--f-serif`.
   - **Stay inside the embeddable font set.** The PDF embeds ONLY what the font
     library ships (`fonts/library.ts`): weights **400/600/700** and the
     **normal** style, reached exclusively through the two slots above. Anything
     else degrades silently in the exported PDF — an unshipped `font-weight`
     (e.g. `800`, `500`) snaps to the nearest embedded weight, `font-style:
     italic` has no face (faux-italic on screen, **upright** in the PDF), and any
     literal or system `font-family` (e.g. `ui-monospace`, a raw stack) is never
     embedded and falls back to a jsPDF standard font — Courier for a monospace
     stack. **When porting a standalone HTML demo, its fonts are unconstrained:
     clamp every weight to {400,600,700}, drop italic, and replace every literal
     `font-family` with `var(--f-serif)`/`var(--f-sans)`.** For tabular figures
     use `font-variant-numeric: tabular-nums` on a slot font, not a mono stack.
     Two guards enforce this: `src/templates/fonts.test.ts` (scans every
     template's CSS in `pnpm test`) and `pnpm verify:pdf` (exports every template
     × font pairing and fails on any fallback font — the browser-only backstop).
   - **Accent** comes from the variant: use `var(--c-accent)` (and the derived
     light tint `var(--c-accent-soft)`) for the design's primary accent. Keep
     genuinely secondary literals (a gold rule, a coral chip) as hex.
   - **Presets**: wrap the largest 2–3 font sizes in
     `calc(<pt>pt * var(--s-font-scale))` so the Size preset works; multiply
     section gaps by `var(--sp-section-scale)` for the Spacing preset.
   - **No raster.** Logos are text/monograms; never `<img>` — it would break the
     true-vector PDF.
   - **No `opacity` for tints.** Element opacity is dropped by the export path
     (a watermark-style ghost glyph simply vanishes from the PDF — hit by the
     cover-letter Foundry). Use a solid pale color instead: `var(--c-accent-soft)`
     is the accent pre-tinted ~92% toward white.
   - **No negative offsets on text.** A glyph whose element box starts above or
     left of the page origin (`top: -78pt` on Foundry's ghost initial) is
     silently dropped from the exported PDF, in every renderer. Keep decorative
     type fully inside the page box.

3. **`index.ts`** — register the design:
   ```ts
   import { lazyTemplate } from "../../lazyTemplate";
   import { <schema> } from "../../../documents/<docType>/schema";
   import { <NAME>_VARIANTS } from "../variants";           // invoice; resume uses theme presets
   import type { <DataType> } from "../../../data/<docType>";

   export const <name>Template = lazyTemplate<<DataType>>(
     { id: "<name>", name: "<Name>", description: "…", schema: <schema>, variants: <NAME>_VARIANTS },
     () => import("./<Name>Preview"),
   );
   ```

4. **`<Name>Preview.test.tsx`** + **`index.test.tsx`** — TDD. Assert the sheet
   renders (`.resume-page` present, a key field, a computed total), the
   empty-field guards hide optional rows, and the lazy `preload()`/`Preview`
   round-trip works. Copy a sibling's tests and rename.

5. **Attach it** to the document type's `templates: [...]` list
   (`documents/<docType>/index.ts`), and — for resumes — also to
   `resume/registry.ts` if you want it in that legacy list.

## Variants (`TemplateVariants`)

```ts
interface TemplateVariants { colors: ColorScheme[]; fonts: FontPairing[]; default: Variant }
```

- **Colors.** Resume templates reuse the global `COLOR_SCHEMES` from
  `theme/variants.ts` (ids `navy`/`charcoal`/`burgundy`/`forest`), so
  `resolveVariant(variant)` resolves them without arguments. Templates with a
  bespoke palette (all the invoice templates) define their own list in
  `invoice/variants.ts` and **must pass it**: `resolveVariant(variant, X_VARIANTS.colors)`.
  This is required because per-template color ids are not in the global map and
  can even collide across templates (e.g. `teal` differs between Prism and
  Bureau) — resolving against the template's own list keeps them independent.
- **Fonts.** Resume/invoice templates reuse the shared `FONT_PAIRINGS` (ids
  `classic`, `editorial`, `modern`, `mono`). Each pairing is `{ display, body }`
  FontIds → `--f-serif` and `--f-sans`. Pick a `default.fontId` whose display
  face matches the look you want by default (e.g. a sans-first design defaults
  to `modern` so its wordmark stays sans; a serif design defaults to
  `editorial`/`classic`).
  - A document type may ship its OWN pairing list when the shared bodies don't
    fit: the cover letters use `CL_FONT_PAIRINGS` (cover-letter/variants.ts),
    where every pairing has a DISTINCT body face — a letter's body is its
    content, so pairing switches must visibly restyle it (with the shared list,
    3 of 4 pairings share an Inter body and look identical on a letter).
  - **If you ship a bespoke pairing list you MUST pass it everywhere it
    resolves**: `resolveVariant(variant, X.colors, X.fonts)` in the Preview,
    and the PDF download already embeds via `template.variants.fonts`
    (`resolveVariantFontIds(v, fonts)` in App.tsx). Rendering with one list and
    embedding with another silently exports fallback fonts.
- **`default`** must reference ids that exist in this template's `colors`/`fonts`.
  Fonts are only embedded in the PDF when their FontId is in the font library
  (`fonts/library.ts` + generated `fonts/fontData.ts`) — all six shipped
  families are.

## Add a new DOCUMENT TYPE (data + schema + prompts)

A design needs a document type behind it. The invoice is the worked example
(`data/invoice.ts`, `documents/invoice/`). Steps:

1. **Data** — `src/data/<type>.ts`: the content interfaces + a fully-populated
   `sample<Type>`. Content only, no design. List items carry a string `id`.
2. **Derived logic (if any)** — a pure, tested module (invoices have
   `documents/invoice/compute.ts` for money). Never compute in the template.
3. **Form schema** — `documents/<type>/schema.ts` via `builder<T>()`:
   `section` / `list` (top level), `row` / `group` / `field` / `textarea` /
   `lines` / `tags` / `number` / `select` (leaves). Write `builder<MyData>()`
   so keys are type-checked. Controls live in `forms/schema.ts` +
   `forms/SchemaForm.tsx` — add a new control there if you need one.
4. **Import prompt/validator** — `documents/<type>/importSpec.ts`: an
   `ImportSpec` built from `str()` / `strings()` / `num()` / `obj()` / `list()`
   (`import/spec.ts`), mirroring the data minus `id`s. The AI-import prompt
   (`import/buildPrompt.ts`) and the strict validator (`import/validate.ts`) are
   BOTH generated from this one object, so they cannot drift. Use `num()` for
   numeric fields (it coerces the numeric strings an LLM tends to emit).
5. **Document module** — `documents/<type>/index.ts` exports a
   `DocumentType<T>`: `{ id, name, defaultData, importSpec, templates,
   collectText }`. `collectText(data)` flattens every user string into one blob
   for the font-coverage warning (include the currency symbol / any special
   glyphs).
6. **Register** — append it to `documents/registry.ts` and remove its name from
   `components/create/CreateGallery.tsx`'s `COMING_SOON_TYPES`. Routes
   (`/build/<type>/<template>/`) are generated automatically from the registry.

## Generalization note

`Template<T>` and `DocumentType<T>` are generic but effectively **invariant** in
`T` (React `ComponentType<P>` is invariant in `P`). At the erased app boundaries
(the registry, the gallery card, the import dialog) use `<any>` — not
`<unknown>` — or `DocumentType<ResumeData>` will not be assignable. This matches
how `App.tsx` and `documents/registry.ts` are already typed.

## Verifying

- `pnpm test` — unit/RTL tests. `pnpm build` — `astro check` (types) + static
  build; confirms every route generates.
- **PDF is browser-only** and dev-sensitive: `pnpm build && pnpm preview` is the
  source of truth (the dev toolbar must stay disabled — see root `AGENTS.md`).
- `pnpm verify:pdf` — the automated forensic gate: builds, exports every
  template × font pairing headlessly, and fails on any raster or fallback font.
  Run it after adding/editing a template. (CI runs it too — see
  `.github/workflows/pdf-forensics.yml`.)
- Forensic checks on a single downloaded PDF: `pdffonts` (designer faces
  `emb yes`), `pdftotext` (real selectable text ⇒ not a raster), and
  `node scripts/inspect-pdf.mjs file.pdf [--strict]` (expects `VERDICT: VECTOR`,
  0 images; `--strict` also exits non-zero if any text is drawn in a
  non-embedded fallback font).
- Confirm each template fits **one page** at true size (`.resume-page`
  `offsetHeight ≤ 1056px`); tune `pt` values if content overflows.
