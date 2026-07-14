# Per-input font picker — design spec

Date: 2026-06-28
Status: Approved (design); ready for implementation planning

## Summary

Add the ability to choose a font for each text input in the editor. Every control in
the schema-driven editor gains a `⋮` trigger that opens a font picker. The chosen
font flows into the live preview **and** the exported PDF. Fonts come from a curated,
OFL-licensed, Latin-subset library that is embedded into the PDF (no network, offline).

The feature must respect the codebase's central invariant: **content (`ResumeData`)
stays design-free**, and the *same rendered DOM* is both the preview and the PDF source.

## Goals

- A per-control font override in the editor (`⋮` → font picker dropdown).
- Overrides render live in the preview and survive PDF export (selectable, embedded
  vector text — never a screenshot).
- A curated library of ~6 font families, defined in one place that drives the picker,
  the `@font-face` rules, and the PDF embedding so they cannot drift.
- Unset fields keep the template's default font (today's behavior, unchanged).

## Non-goals (YAGNI)

- No per-field size/weight/color controls. The `⋮` menu holds **font only**. (The menu
  is structured so a future size/weight item could be added, but that is out of scope.)
- No new persistence layer. Overrides live in session React state like content does:
  they survive template switches but reset on reload. No localStorage.
- No change to the coverage-warning logic (see "Coverage" below).
- No multi-page export improvements; pagination behavior is unchanged.

## Architecture

### Data model — overrides are separate from content

`ResumeData` remains content-only. Font choices live in a **parallel map** held in
`App` state alongside `data`:

```ts
type FontId = string;                  // e.g. "inter", "playfair", "plexMono"
type FieldPath = string;               // stable path to a control (see below)
type FontOverrides = Record<FieldPath, FontId>;
```

- An entry's presence means "this field uses this font." Absence means "use the
  template default."
- Override semantics: **font-family only**. Size, weight, casing, color, tracking,
  and all other styling continue to come from the template/theme. The override swaps
  the typeface and nothing else.

### Field paths

The `SchemaForm` already walks the schema tree; it will compute a stable `FieldPath`
for each leaf control as it renders:

- Top-level field: `name`, `headline`, `summary`
- Group child: `contact.email`, `contact.phone`, `contact.location`,
  `contact.website`, `contact.linkedin`
- Array item field: `experience.<id>.role`, `experience.<id>.company`,
  `experience.<id>.location`, `experience.<id>.start`, `experience.<id>.end`,
  `experience.<id>.bullets`, `education.<id>.*`, `skills.<id>.label`,
  `skills.<id>.items`

Array items use their existing `id` (not array index), so paths survive reordering,
insertion, and deletion. A `lines` control (e.g. Bullets) is **one** control, so its
override applies to all lines it produces; likewise a `tags` control (Skills items) is
one control covering all its tags.

### Font library — single source of truth

A new `src/fonts/library.ts` is the one place fonts are defined. It drives three
consumers so they can never drift (the same discipline as today's `FONTS` array in
`registerFonts.ts`):

1. the picker options (id, display name, category, CSS family name),
2. the preview `@font-face` rules,
3. the PDF embedding (VFS file name + `pdfFontFaces` `src.url`).

Each library entry describes a family and the weights it ships. Shape (final field
names settled in the plan):

```ts
interface FontDef {
  id: FontId;            // stable key stored in FontOverrides
  name: string;          // display name shown in the picker
  category: "sans" | "serif" | "mono";
  cssFamily: string;     // the font-family name used in CSS / @font-face
  stack: string;         // full CSS stack incl. system fallback
  weights: FontWeightFile[]; // { weight, file, data(base64) } per shipped weight
}
```

Curated set (all OFL, Latin-subset):

| id            | Family            | Category | Notes                         |
|---------------|-------------------|----------|-------------------------------|
| `inter`       | Inter             | sans     | Existing; default body/UI     |
| `sourceSerif` | Source Serif 4    | serif    | Existing; default name        |
| `lora`        | Lora              | serif    | New; warm body serif          |
| `playfair`    | Playfair Display  | serif    | New; high-contrast display    |
| `plexSans`    | IBM Plex Sans     | sans     | New; humanist sans            |
| `plexMono`    | IBM Plex Mono     | mono     | New; monospace                |

Weights: each family ships the weights the templates actually apply (body 400,
headings 600, name 700). Where a family lacks an exact weight, the nearest available
weight is used and that mapping is recorded in the library entry. Exact per-family
weight list is finalized during implementation when the TTFs are subset.

### Template integration

The preview template must apply overrides per element — this is the one place the
content/design boundary is necessarily crossed, because only the hand-authored design
knows which element renders which field.

- `App` passes `fontOverrides` (and the resolved library) down to the `Preview`.
- A small helper resolves a `FieldPath` to a CSS `font-family` stack (override stack if
  set, otherwise `undefined` so the template's own CSS wins). Templates call it per
  element, e.g. `style={fontStyleFor("name")}`.
- `ClassicPreview` is updated to apply the helper on each field-bearing element:
  - `name`, `headline`, `summary`
  - per-experience: `role`, `company`/`location` (each its own span), `start`/`end`
    (the date span), `bullets` (the `ul`/its `li`s)
  - per-education: analogous fields
  - per-skill: `label`, `items` (the values span)
  - contact: each part span (`email`, `phone`, …). Today `contactParts` returns bare
    strings; it will be extended to carry each part's field key so the matching
    `FieldPath` (`contact.<key>`) can be resolved per span.

Any future template opts in the same way; a template that ignores `fontOverrides`
simply renders its default fonts (graceful, no error).

### Editor UI — the `⋮` menu

Each rendered control in `SchemaForm` gets a `⋮` trigger docked at the input's trailing
edge (inside/at the right of the control, vertically centered). It uses the existing
shadcn `DropdownMenu` primitive.

Dropdown contents:

- A **"Default"** entry at the top that clears the override for this field.
- Font options grouped by category (Sans / Serif / Mono), each rendered **in its own
  typeface** so the choice is visible.
- The currently-applied font shows a check; "Default" is checked when no override.

Discoverability: the `⋮` trigger reflects state — visually distinct (e.g. filled vs.
muted/outline) when the field has a non-default override, so customized fields are
glanceable. The exact visual treatment is finalized during implementation under the
`frontend-design` skill.

`SchemaForm` gains two props: the current `fontOverrides` and an
`onFontChange(path, fontId | null)` callback (null clears). It threads the computed
`FieldPath` into each control's menu. This applies uniformly to `text`, `textarea`,
`stringList` (lines and tags) controls.

### PDF export

- The offscreen capture copy in `App` already re-renders the same `Preview`; it will be
  given the same `fontOverrides`, so inline `font-family` is present in the DOM that
  `doc.html()` measures and draws.
- `registerFonts.ts` will embed **only the fonts actually in use** — the template's
  default font(s) plus any font id present in `fontOverrides` — rather than the entire
  library, so a resume using two fonts does not carry six. Embedding stays base64 /
  no-network, preserving the offline invariant.
- The font-registration invariant is preserved: each font's `file` name is
  simultaneously the jsPDF VFS key and the `pdfFontFaces` `src.url`. Both derive from
  the single library entry.

### Coverage warning

Unchanged. Every library font is subset to the same Latin glyph set, so the existing
`coverage.ts` check remains valid regardless of which font a field uses: a character is
unsupported (and warned about) iff it falls outside the shared Latin subset.

### Reset

The "Reset sample" action clears `fontOverrides` in addition to resetting `data`.

## Asset / build pipeline work

Adding the four new families is mechanical but real and is the bulk of the effort:

1. Obtain OFL TTFs for Lora, Playfair Display, IBM Plex Sans, IBM Plex Mono.
2. Subset each to the Latin glyph set (matching the current subset approach).
3. Extend `gen:fonts` to emit base64 for all library weights into the generated
   font-data module.
4. Add `@font-face` rules for each new family/weight (preview).
5. Register each in `library.ts`; `registerFonts.ts` consumes the library.
6. Include each font's OFL license file alongside the existing font licenses.

## Components & their responsibilities

- `src/fonts/library.ts` — the font registry (id, name, category, css family, stack,
  weights+data). Single source of truth.
- `src/fonts/registerFonts.ts` — consumes the library; embeds **only used** fonts into
  jsPDF and builds `pdfFontFaces` for them.
- `src/fonts/fonts.css` — `@font-face` for every library family/weight (preview).
- `src/forms/SchemaForm.tsx` — computes `FieldPath` per control; renders the `⋮`
  font-picker menu; emits `onFontChange`.
- A new font-picker dropdown component (in `src/forms/` or `src/components/`) — renders
  grouped, in-typeface options + "Default", reflects current selection.
- `src/templates/classic/ClassicPreview.tsx` — applies `fontStyleFor(path)` per
  field-bearing element; `contactParts` extended to carry field keys.
- A small `fontStyleFor` / override-resolution helper (shared by preview + capture).
- `src/App.tsx` — owns `fontOverrides` state; passes to `SchemaForm`, `Preview`, and
  the capture copy; clears on Reset; export path embeds only used fonts.

## Testing

- **Path computation**: `SchemaForm` produces correct, stable `FieldPath`s for nested
  groups and array items (by id, not index); paths stable across reorder/add/remove.
- **Override application**: setting a font for a path renders the matching preview
  element with that family; clearing returns it to the template default.
- **Library integrity**: every library entry's `file` is used as both VFS key and
  `pdfFontFaces` `src.url` (invariant test); ids are unique.
- **Used-fonts selection**: given a default + overrides, the embedder selects exactly
  the in-use fonts (no more, no fewer).
- **Picker UI**: dropdown lists all library fonts grouped by category plus "Default";
  selecting emits `onFontChange(path, id)`; "Default" emits `onFontChange(path, null)`;
  the trigger reflects override vs. default state.
- **Reset** clears overrides.
- Existing PDF-export tests/verification (`pdffonts`, `pdftotext`,
  `scripts/inspect-pdf.mjs`) continue to pass and now show any newly used embedded
  family.

## Open implementation details (resolved during planning, not blockers)

- Exact weights shipped per family and the nearest-weight fallback table.
- Whether the override helper lives in `theme/`, `fonts/`, or `templates/`.
- Final visual treatment of the `⋮` trigger and dropdown (under `frontend-design`).
