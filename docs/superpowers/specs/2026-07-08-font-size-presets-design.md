# Font-Size Presets — Design Spec

**Date:** 2026-07-08
**Status:** Approved (design confirmed via interactive demo)

## Overview

Add a fourth template-styling axis — **font size** — to the Style popover, beside
Color, Font, and Spacing. The user picks one of three presets — **Small /
Medium / Large** — and the résumé's whole type scale (name, section headings,
body text, and leading) grows or shrinks proportionally, preserving the visual
hierarchy. Like the other axes, the choice lives on the `Variant` object, so it
persists into the exported PDF automatically (the PDF is the rendered DOM).

**Scope (confirmed):** whole type scale — every text size scales together, plus
the absolute line-heights, so rhythm stays balanced. **Medium (1×) reproduces
today's output pixel-for-pixel.**

**Label note:** the middle preset is "Medium", not "Default", to avoid a
duplicate "Default" button next to the Spacing row (the Spacing axis already
uses Compact / **Default** / Relaxed). Small/Medium/Large is also the
conventional naming for a size control.

## Mechanism — one scale token, consumed two ways

A single unitless multiplier token, **`--s-font-scale`** (Small `0.9`, Medium
`1`, Large `1.1`), drives everything. It reaches font sizes through two paths:

1. **Theme tokens become scale-aware.** `themeCssVars()` currently emits each
   size as a fixed length (`--s-body: 9.5pt`). It will instead emit each size and
   leading token as a `calc()` that references the scale:

   ```
   --s-font-scale: 1;
   --s-name:    calc(25pt   * var(--s-font-scale));
   --s-headline:calc(10.5pt * var(--s-font-scale));
   --s-contact: calc(9pt    * var(--s-font-scale));
   --s-section: calc(9.5pt  * var(--s-font-scale));
   --s-role:    calc(10.5pt * var(--s-font-scale));
   --s-org:     calc(9.5pt  * var(--s-font-scale));
   --s-date:    calc(9pt    * var(--s-font-scale));
   --s-body:    calc(9.5pt  * var(--s-font-scale));
   --lh-contact:calc(12.4pt * var(--s-font-scale));
   --lh-body:   calc(12.4pt * var(--s-font-scale));
   ```

   Every template that reads `var(--s-*)` / `var(--lh-*)` — **all of Classic and
   Meridian, most of Quill and Atlas** — then scales with **zero CSS edits**. At
   scale `1`, `calc(9.5pt * 1)` = `9.5pt`, so the Medium preset is byte-identical
   to today.

2. **Hardcoded literals wrap the same token.** The handful of font-sizes (and
   one absolute line-height) written as raw `pt` in Quill, Ledger, and Atlas are
   wrapped in `calc(<pt> * var(--s-font-scale, 1))`:

   | Template | Literals to wrap |
   |---|---|
   | Quill  | name `26pt` |
   | Ledger | body `8.8pt`, name `20pt`, headline `9.5pt`, contact `8pt`, section `8.4pt`, role `9pt`, org `8.8pt`, date `8pt`, detail `8.4pt`, **and** body line-height `11.6pt` |
   | Atlas  | name `20pt`, `.atl-h 8.6pt`, contact-line `8.6pt`, skill-label `8.8pt`, skill-val `8.6pt`, edu-deg `8.8pt`, edu-inst `8.6pt`, edu-meta `8.4pt` |

Unitless line-heights (Ledger's `1.5/1.35/1.3/1.02`, Atlas's `1.4/1.05`, name
`1.02/1.05`) already scale with their element's font size, so they are left
alone. Decorative fixed offsets (e.g. Ledger's bullet `::before { top: 4.6pt }`)
are left unscaled — within the 0.9–1.1 range the drift is sub-pt and
imperceptible; keeping scope tight.

**Why nested `calc`/`var` is PDF-safe:** the browser resolves
`font-size: var(--s-body)` → `calc(9.5pt * var(--s-font-scale))` → a px
used-value in `getComputedStyle`, which is what html2canvas/jsPDF `doc.html()`
read for glyph geometry. Same resolution path already proven by the Spacing
feature's `--sp-section-scale`. No raster, no new fonts.

## Data model — `src/theme/variants.ts`

```ts
export interface SizePreset {
  id: string;
  name: string;
  /** Unitless multiplier applied to every font size + leading. */
  scale: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: "small",  name: "Small",  scale: 0.9 },
  { id: "medium", name: "Medium", scale: 1 },
  { id: "large",  name: "Large",  scale: 1.1 },
];

export const DEFAULT_SIZE_ID = "medium";
```

`Variant` gains an **optional** `sizeId` (absent ⇒ `DEFAULT_SIZE_ID`, scale 1),
so every existing `{ colorId, fontId }` / `{ …, spacingId }` literal, test, and
`DEFAULT_VARIANT` stay valid:

```ts
export interface Variant {
  colorId: string;
  fontId: string;
  spacingId?: string;
  sizeId?: string;
}
```

`resolveVariant()` returns an additional `fontScale`:

```ts
export function resolveVariant(v: Variant): {
  accent: string; displayStack: string; bodyStack: string;
  sectionScale: number; fontScale: number;
} { /* …existing… + fontScale: sizePreset(v.sizeId).scale */ }
```

`resolveVariantFontIds()` is unaffected (size has no fonts).

## Token emission — `src/theme/theme.ts`

`themeCssVars()`'s overrides param gains `fontScale?: number`. Emit
`--s-font-scale: String(fontScale ?? 1)`, and rewrite the eight `--s-*` size
tokens and two `--lh-*` leading tokens to the `calc(<base>pt * var(--s-font-scale))`
forms above. Because `themeCssVars(resolveVariant(variant))` already flows the
resolved object in, `fontScale` reaches the CSS with no template call-site
changes. `themeCssVars()` with no args ⇒ scale defaults to 1.

## Template CSS

- **Classic, Meridian:** no changes (fully token-based).
- **Quill:** wrap the name `26pt`.
- **Ledger:** wrap all nine `font-size` literals + the `11.6pt` body line-height.
- **Atlas:** wrap the name `20pt` + seven sidebar `font-size` literals.

All wraps use `calc(<pt> * var(--s-font-scale, 1))`. No hierarchy, spacing, or
color rules change.

## UI wiring

- **`src/forms/VariantPicker.tsx`** — add a `sizes: SizePreset[]` prop and a
  fourth `<section>` titled "Size": a `role="group"` of segmented buttons
  (mirroring the Spacing section), each `aria-pressed` when
  `(value.sizeId ?? DEFAULT_SIZE_ID) === preset.id`, `onClick` →
  `onChange({ ...value, sizeId: preset.id })`.
- **`src/App.tsx`** — import `SIZE_PRESETS`; pass `sizes={SIZE_PRESETS}` to
  `<VariantPicker>`. `sizeId` rides inside the existing `variant` state, reset,
  and PDF capture — no new state.

Size presets are global (identical for every template), so — like the spacing
presets — they are passed as the shared `SIZE_PRESETS` constant from `App`, not
added to `TemplateVariants`.

## Testing

- **`variants.test.ts`**: `SIZE_PRESETS` ids/`DEFAULT_SIZE_ID`; `resolveVariant`
  returns `fontScale` 1 default/absent, 0.9 small, 1.1 large; unknown `sizeId`
  falls back to 1. Update the two existing `resolveVariant` `toEqual` assertions
  to include `fontScale: 1` (they gained `sectionScale` last feature; now also
  `fontScale`).
- **`theme.test.ts`**: `themeCssVars()["--s-font-scale"]` is `"1"`,
  `themeCssVars({ fontScale: 1.1 })["--s-font-scale"]` is `"1.1"`; and a size
  token is now scale-aware, e.g. `themeCssVars()["--s-body"]` ===
  `"calc(9.5pt * var(--s-font-scale))"`.
- **`VariantPicker.test.tsx`**: thread `sizes={SIZE_PRESETS}` through the helper;
  renders `Small`/`Medium`/`Large`; `Medium` pressed when `sizeId` absent;
  clicking `Large` emits `{ colorId:"navy", fontId:"classic", sizeId:"large" }`.
  Existing color/font/spacing assertions stay green. **No duplicate "Default"
  button** (size uses "Medium"), so the existing `getByRole("button",{name:"Default"})`
  spacing query stays unambiguous.
- **One template preview test** (Meridian): `variant={{ …, sizeId:"large" }}` sets
  `--s-font-scale: 1.1` on `.resume-page`.
- **`App.test.tsx`**: open the Style popover, click `Large`, assert the preview
  `.resume-page` has `--s-font-scale: 1.1`.
- Full suite + `pnpm build` (0 errors) + browser verification: live sizes change
  in preview; exported PDF stays VECTOR/single-checks; re-verify Atlas two-column
  at Small and Large.

## Non-goals

- No per-field size override (template-wide preset chosen).
- No body-only scope (whole type scale chosen).
- No continuous slider or exact-point-value input (3 presets).
- No per-template size catalogs; presets are global.
- Decorative fixed offsets (bullet dot tops) are not scaled.
