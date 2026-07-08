# Templates — authoring guide

Guidance for Claude Code when adding or editing templates. Read the **root
`CLAUDE.md`** first for the big picture (client-side, true-vector PDF via
`doc.html()`, geometry in points). This file is the practical how-to for this
folder.

## Layout

```
src/templates/
  types.ts          Template<T> + TemplateVariants interfaces        (shared)
  lazyTemplate.ts   lazyTemplate<T>(meta, load) — wires a code-split chunk (shared)
  resume/           the résumé designs (one folder per template) + registry.ts
  invoice/          variants.ts (per-template palettes) + the invoice designs
```

A **template** is one *design* over a document's data type `T`. Designs are
grouped by document type: résumé designs live in `resume/`, invoice designs in
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
résumé entry, **invoice line-item row**, or totals box is ever split across a
page boundary. Both behaviors are driven by two `data-*` attributes you put on
the design's repeating / keep-together content. **Every template must carry them
so the divider shows on it** (a template with none shows no divider and its PDF
slices content mid-block):

- **`data-pdf-block`** — a keep-together unit that must never straddle a page
  boundary: a résumé entry / skill row, an **invoice line-item row**, the totals
  box, the footer. Put it on each repeating row and each closing block.
- **`data-pdf-heading`** *(optional)* — a section title that must stay with the
  first `data-pdf-block` that follows it (résumé section headings use this).
  Omit it where there is no such title — the invoices don't use it.

Mechanics: `src/pdf/paginate.ts` measures these blocks and inserts a spacer
before any that would straddle a page (pushing it below the next page's top
margin); `src/preview/previewBreaks.ts` runs the identical math but leaves a
visible divider. You only annotate the markup — no per-template wiring.

- **Table-based item lists** (Bureau, Sterling render items as `<table>`): put
  `data-pdf-block` on each `<tbody>` `<tr>`. The spacer is emitted as a `<tr>`
  automatically (a `<div>` sibling would be an invalid table child and render
  outside the row flow) — mark the row and nothing else.
- **The one exception is Atlas** (the two-column résumé), left intentionally
  unmarked: a full-width spacer cannot be inserted into a two-column flow, so it
  shows no divider until the pre-pass grows column awareness. Any other new
  single-column template must be marked.

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
     (title/name, party names, line-item descriptions). Build paths with
     `joinPath("items", item.id, "description")`.
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
     hit. The résumé name (`.resume-name`) is the reference: it uses `--f-serif`.
   - **Accent** comes from the variant: use `var(--c-accent)` (and the derived
     light tint `var(--c-accent-soft)`) for the design's primary accent. Keep
     genuinely secondary literals (a gold rule, a coral chip) as hex.
   - **Presets**: wrap the largest 2–3 font sizes in
     `calc(<pt>pt * var(--s-font-scale))` so the Size preset works; multiply
     section gaps by `var(--sp-section-scale)` for the Spacing preset.
   - **No raster.** Logos are text/monograms; never `<img>` — it would break the
     true-vector PDF.

3. **`index.ts`** — register the design:
   ```ts
   import { lazyTemplate } from "../../lazyTemplate";
   import { <schema> } from "../../../documents/<docType>/schema";
   import { <NAME>_VARIANTS } from "../variants";           // invoice; résumé uses theme presets
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
   (`documents/<docType>/index.ts`), and — for résumés — also to
   `resume/registry.ts` if you want it in that legacy list.

## Variants (`TemplateVariants`)

```ts
interface TemplateVariants { colors: ColorScheme[]; fonts: FontPairing[]; default: Variant }
```

- **Colors.** Résumé templates reuse the global `COLOR_SCHEMES` from
  `theme/variants.ts` (ids `navy`/`charcoal`/`burgundy`/`forest`), so
  `resolveVariant(variant)` resolves them without arguments. Templates with a
  bespoke palette (all the invoice templates) define their own list in
  `invoice/variants.ts` and **must pass it**: `resolveVariant(variant, X_VARIANTS.colors)`.
  This is required because per-template color ids are not in the global map and
  can even collide across templates (e.g. `teal` differs between Prism and
  Bureau) — resolving against the template's own list keeps them independent.
- **Fonts.** Reuse the shared `FONT_PAIRINGS` (ids `classic`, `editorial`,
  `modern`, `mono`). Each pairing is `{ display, body }` FontIds → `--f-serif`
  and `--f-sans`. Pick a `default.fontId` whose display face matches the look
  you want by default (e.g. a sans-first design defaults to `modern` so its
  wordmark stays sans; a serif design defaults to `editorial`/`classic`).
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
  source of truth (the dev toolbar must stay disabled — see root `CLAUDE.md`).
- Forensic checks on a downloaded PDF: `pdffonts` (designer faces `emb yes`),
  `pdftotext` (real selectable text ⇒ not a raster), and
  `node scripts/inspect-pdf.mjs file.pdf` (expects `VERDICT: VECTOR`, 0 images).
- Confirm each template fits **one page** at true size (`.resume-page`
  `offsetHeight ≤ 1056px`); tune `pt` values if content overflows.
