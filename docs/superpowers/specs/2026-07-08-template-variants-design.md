# Template color + font variants — design

**Date:** 2026-07-08
**Status:** Approved (brainstorming) → ready for implementation plan

## Goal

Let a user toggle the resume template's **color scheme** and **font pairing** from a live
in-builder picker. Each option is its own visual demo (accent swatches, font specimens);
clicking one instantly re-renders the live preview, and the choice flows into the exported
PDF unchanged. Variants are **template-wide presets**; the existing per-field font picker
(`FontPicker` + `overrides.ts`) stays as a fine-tuning layer that layers **on top** of the
selected pairing.

## Non-goals

- No new fonts. Variants reuse the existing 6-font library (`src/fonts/library.ts`).
- No standalone showcase/demo page — the live preview is the demonstration.
- Variants are **not** part of `ResumeData`. They are design metadata, kept separate
  alongside `fontOverrides` (same pattern the per-field font system already uses).
- No change to today's default look: the classic template's default variant reproduces the
  current design exactly (navy accent, Source Serif name + Inter body).

## Catalog (confirmed)

**Color schemes (4).** Each varies only the accent (`--c-accent`, used by the headline,
section headings, org names, and bullet dots). Body ink/muted/faint/rule stay constant for
ATS-safety and print legibility.

| id       | name     | accent   |
|----------|----------|----------|
| navy     | Navy     | #1f3a5f  | (current default)
| charcoal | Charcoal | #2b2f36  |
| burgundy | Burgundy | #7c2d3a  |
| forest   | Forest   | #285043  |

**Font pairings (4).** `display` fills the `--f-serif` slot (the name/display font), `body`
fills the `--f-sans` slot (body text + headings). Both reference existing `FontId`s.

| id        | name      | display (`--f-serif`) | body (`--f-sans`) |
|-----------|-----------|-----------------------|-------------------|
| classic   | Classic   | sourceSerif           | inter             | (current default)
| editorial | Editorial | playfair              | inter             |
| modern    | Modern    | plexSans              | plexSans          |
| mono      | Mono      | plexMono              | inter             |

("display"/"body" name the *roles*, not font classifications — `Modern`/`Mono` intentionally
put a sans/mono face in the display slot.)

## Architecture

### 1. `src/theme/variants.ts` (new) — the catalog + resolvers

```ts
export interface ColorScheme { id: string; name: string; accent: string; }
export interface FontPairing { id: string; name: string; display: FontId; body: FontId; }
export interface Variant     { colorId: string; fontId: string; }   // the current selection

export const COLOR_SCHEMES: ColorScheme[];   // the 4 above
export const FONT_PAIRINGS:  FontPairing[];   // the 4 above
export const DEFAULT_VARIANT: Variant = { colorId: "navy", fontId: "classic" };

// ids → concrete CSS values, for themeCssVars(); unknown ids fall back to the default.
export function resolveVariant(v: Variant): {
  accent: string; displayStack: string; bodyStack: string;
};
// ids → FontId[] (display + body), for PDF embedding.
export function resolveVariantFontIds(v: Variant): FontId[];
```

`resolveVariant` uses `fontStack(id)` from the font library for the two stacks. Both resolvers
are total: an unknown `colorId`/`fontId` resolves to the corresponding default so a stale
selection can never blank out a var.

### 2. Templates own their variants

`Template` (and `lazyTemplate`'s `meta`) gain:

```ts
variants: { colors: ColorScheme[]; fonts: FontPairing[]; default: Variant };
```

The classic template references the shared catalog and sets
`default = DEFAULT_VARIANT`. Future templates may ship their own palettes. The `Preview`
component type gains an optional `variant?: Variant` prop.

### 3. `themeCssVars(overrides?)` — merge variant over defaults

```ts
export function themeCssVars(
  overrides?: { accent?: string; displayStack?: string; bodyStack?: string },
): StyleWithVars;
```

When present, `overrides.accent` replaces `--c-accent`, `overrides.bodyStack` replaces
`--f-sans`, and `overrides.displayStack` replaces `--f-serif`. Absent → today's theme
defaults, so every existing call site is unaffected.

### 4. `ClassicPreview` — apply the variant

Signature becomes `{ data, fontOverrides?, variant? }`. It calls
`resolveVariant(variant ?? <template default>)` and passes the result into `themeCssVars(...)`
on the `.resume-page` root. The per-field `fontStyleFor` inline styles are unchanged and still
win over the variant's `--f-sans`/`--f-serif`, so per-field overrides layer on top.

### 5. `App.tsx` — state, live preview, capture, reset

- New state `const [variant, setVariant] = useState<Variant>(() => template.variants.default)`.
- Pass `variant` to the live `<Preview>`.
- **Freeze `variant` into the capture snapshot** (`setCapture({ data, fontOverrides, variant, Comp })`)
  and render the offscreen capture copy with it — same freezing discipline as `fontOverrides`.
- `handleReset` also restores `template.variants.default`.
- Render a new `VariantPicker` in a Style toolbar row (see §7).

### 6. PDF font embedding — `download.ts` + `usedFontIds`

The selected pairing's fonts must be embedded (e.g. Playfair, Plex). Currently
`usedFontIds(overrides)` unions a hardcoded `BASELINE_FONT_IDS = [inter, sourceSerif]` with the
per-field override fonts. Change:

- `usedFontIds(overrides, baseIds?: FontId[])` — unions `baseIds` (defaulting to the classic
  pairing `[sourceSerif, inter]`) with the per-field override fonts.
- `downloadResumePdf(element, filename?, overrides?, baseFontIds?)` threads `baseFontIds` into
  `usedFontIds`. App computes it via `resolveVariantFontIds(capture.variant)` and passes it in.

This keeps embedding minimal (only the fonts actually on the page) while guaranteeing the
variant's fonts are present. `BASELINE_FONT_IDS` is retained as the default `baseIds` value.

### 7. `VariantPicker` component + Style toolbar

A new presentational component (`src/forms/VariantPicker.tsx`) given
`{ colors, fonts, value: Variant, onChange }`:

- **Color** group: a row of accent-filled circular swatches; the active one shows a
  ring/check. Each has an accessible name (the scheme name).
- **Font** group: a row of specimen buttons; each renders its pairing name in that pairing's
  display font, with an active state.

Placement: a **slim full-width Style toolbar** rendered in `App.tsx` directly below the main
`<header>` and above `.workspace` — it spans both panes and does **not** sit inside the
preview's observed scaling stage, so the `ResizeObserver`/scale logic is untouched. It wraps on
narrow screens. Visual styling per the frontend-design skill; the resume sheet itself is never
restyled (only `.resume-page`'s CSS vars change).

## Data flow

```
VariantPicker.onChange → App.variant state
  → live <Preview data variant fontOverrides>  → resolveVariant → themeCssVars → .resume-page vars
  → (on Download) frozen capture snapshot {data, fontOverrides, variant}
       → offscreen <Comp> renders with variant
       → downloadResumePdf(host, name, overrides, resolveVariantFontIds(variant))
            → usedFontIds unions variant fonts → registerFonts embeds them
```

## Invariants preserved

- **Design metadata stays out of `ResumeData`** — variant lives beside `fontOverrides`.
- **Font registration invariant** (`file` = VFS key = `@font-face` url) is untouched; variants
  only *select* already-registered library fonts.
- **Capture freezing** — variant is frozen into the snapshot exactly like data/fontOverrides so
  a mid-export toggle can't change what `doc.html()` measures.
- **Dev-toolbar / `pnpm preview` source-of-truth** gotchas are unaffected.
- **Default look unchanged** — `DEFAULT_VARIANT` reproduces the current navy + Source Serif +
  Inter design; all existing `themeCssVars()` / `ClassicPreview` call sites work without edits.

## Testing (TDD)

- `variants.test.ts`: unique ids; every `display`/`body` id exists in the font library; default
  ids are valid; `resolveVariant` returns the expected accent/stacks; unknown ids fall back to
  defaults; `resolveVariantFontIds` returns display+body ids.
- `theme.test.ts` (extend): `themeCssVars(overrides)` merges accent/font vars; argless call is
  unchanged.
- `overrides.test.ts` (extend): `usedFontIds(overrides, baseIds)` unions base + override fonts.
- `VariantPicker.test.tsx`: renders a swatch per color and a specimen per pairing; marks the
  active option; `onChange` fires with the new `Variant`.
- `App.test.tsx` (extend): selecting a color/font updates `.resume-page`'s inline
  `--c-accent`/`--f-sans`/`--f-serif`; Reset restores the default.
- `ClassicPreview.test.tsx` (extend): a passed `variant` sets the expected root CSS vars;
  per-field font override still wins over the pairing.

## Files

**New:** `src/theme/variants.ts`, `src/theme/variants.test.ts`,
`src/forms/VariantPicker.tsx`, `src/forms/VariantPicker.test.tsx`.

**Edited:** `src/theme/theme.ts` (themeCssVars overrides), `src/templates/types.ts` +
`src/templates/lazyTemplate.ts` (Template.variants + Preview prop),
`src/templates/classic/index.ts` (attach variants),
`src/templates/classic/ClassicPreview.tsx` (apply variant),
`src/fonts/overrides.ts` (usedFontIds base ids), `src/pdf/download.ts` (thread base font ids),
`src/App.tsx` (variant state + toolbar + capture), `src/index.css` (Style toolbar layout),
and the corresponding existing test files.
