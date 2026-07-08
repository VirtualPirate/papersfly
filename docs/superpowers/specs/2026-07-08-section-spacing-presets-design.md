# Section-Spacing Presets — Design Spec

**Date:** 2026-07-08
**Status:** Approved

## Overview

Add a third template-styling axis — **section spacing** — alongside the existing
Color and Font pickers. The user chooses one of three presets — **Compact /
Default / Relaxed** — from the Style popover, and the vertical gap *between
résumé sections* (Summary → Experience → Education → Skills) tightens or loosens
live. Like color and font, the choice is part of the `Variant` object, so it
persists into the exported PDF automatically (the PDF is the rendered DOM — no
separate layout to wire).

**Scope (confirmed with user):** the control affects **only the gaps between
sections**. Spacing *within* items (item gaps, bullet gaps, after-heading gaps)
is unchanged.

## User experience

- The Style popover (`VariantPicker`) gains a third labelled section, **Spacing**,
  below Font: three segmented buttons `Compact` · `Default` · `Relaxed`.
- Selecting one emits a new `Variant` with only `spacingId` replaced; the live
  preview re-renders instantly (no apply step), matching the color/font pattern.
- **Default reproduces today's layout pixel-for-pixel** (scale factor `1`).
- The popover trigger button in the header is unchanged (still shows the color
  swatch + font name); spacing is not surfaced on the trigger.

## Mechanism — a relative multiplier

Each template already has its own tuned base section gap:

| Template | Section-gap rule (current) | Base |
|---|---|---|
| Classic  | `.resume-section { margin-top: var(--sp-section-top) }` | 12pt (theme token) |
| Meridian | `.mrd-section { margin-top: var(--sp-section-top) }` | 12pt (theme token) |
| Quill    | `.qll-section { margin-top: 14pt }` | 14pt |
| Ledger   | `.ldg-section { margin-top: 10pt }` | 10pt |
| Atlas    | `.atl-block { margin-top: 18pt }` | 18pt |

Forcing a single absolute value on all of them would erase each template's
density identity (dense Ledger would go loose; airy Atlas would go tight).
Instead the preset emits **one unitless multiplier token, `--sp-section-scale`**,
and each template multiplies *its own* base gap by it via `calc()`:

```css
.mrd-section { margin-top: calc(var(--sp-section-top) * var(--sp-section-scale)); }
.qll-section { margin-top: calc(14pt * var(--sp-section-scale)); }
.ldg-section { margin-top: calc(10pt * var(--sp-section-scale)); }
.atl-block   { margin-top: calc(18pt * var(--sp-section-scale)); }
```

Scale factors:

| Preset | id | scale |
|---|---|---|
| Compact | `compact` | `0.5` |
| Default | `default` | `1` |
| Relaxed | `relaxed` | `1.75` |

With scale `1`, `calc(base * 1)` = `base`, so the Default preset is byte-identical
to the current output. Because the multiplier is relative, every template keeps
its character and simply breathes more or less.

**Atlas note:** `.atl-block` is the section unit in *both* the sidebar
(Contact/Skills/Education) and the main column (Summary/Experience), so scaling
it uniformly is exactly "gap between sections" for the two-column layout. The
existing `:first-child { margin-top: 0 }` resets are untouched and still win.

## Data model — `src/theme/variants.ts`

```ts
export interface SpacingPreset {
  id: string;
  name: string;
  /** Unitless multiplier applied to each template's base section gap. */
  scale: number;
}

export const SPACING_PRESETS: SpacingPreset[] = [
  { id: "compact", name: "Compact", scale: 0.5 },
  { id: "default", name: "Default", scale: 1 },
  { id: "relaxed", name: "Relaxed", scale: 1.75 },
];

export const DEFAULT_SPACING_ID = "default";
```

`Variant` gains an **optional** `spacingId`:

```ts
export interface Variant {
  colorId: string;
  fontId: string;
  spacingId?: string; // absent ⇒ DEFAULT_SPACING_ID
}
```

Optional is deliberate: every existing `default: { colorId, fontId }` literal in
the five template index files, every test, and `DEFAULT_VARIANT` stay valid and
unchanged. Absence resolves to `default` (scale 1).

`resolveVariant()` returns an additional `sectionScale`:

```ts
export function resolveVariant(v: Variant): {
  accent: string;
  displayStack: string;
  bodyStack: string;
  sectionScale: number;
} {
  // ...existing accent/displayStack/bodyStack...
  const s = SPACING_BY_ID.get(v.spacingId ?? DEFAULT_SPACING_ID)
    ?? SPACING_BY_ID.get(DEFAULT_SPACING_ID)!;
  return { accent, displayStack, bodyStack, sectionScale: s.scale };
}
```

`resolveVariantFontIds()` is unaffected (spacing has no fonts).

## Token emission — `src/theme/theme.ts`

`themeCssVars()`'s overrides param gains an optional `sectionScale?: number`, and
the function emits a new CSS var (defaulting to `1` when absent, so callers like
`themeCssVars()` with no args are unaffected):

```ts
"--sp-section-scale": String(overrides?.sectionScale ?? 1),
```

Because `themeCssVars(resolveVariant(variant))` already flows `resolveVariant`'s
return object straight in, the scale reaches the CSS var with no call-site
changes in the templates.

## Template CSS — one line each

Change the five section-gap rules to the `calc()` forms shown in the Mechanism
table above. Nothing else in the CSS files changes; `:first-child` resets and all
other spacing tokens are left alone. Classic's `.resume-section` is the only edit
inside `classic.css` and introduces no class-name collision (it is a value
change on an existing rule).

## UI wiring

- **`src/forms/VariantPicker.tsx`** — add a `spacings: SpacingPreset[]` prop and a
  third `<section>` titled "Spacing" (mirroring the Color/Font sections): a
  `role="group"` of segmented buttons, each `aria-pressed` when
  `(value.spacingId ?? DEFAULT_SPACING_ID) === preset.id`, `onClick` →
  `onChange({ ...value, spacingId: preset.id })`.
- **`src/App.tsx`** — import `SPACING_PRESETS`; pass `spacings={SPACING_PRESETS}`
  to `<VariantPicker>`. No new state: `spacingId` rides inside the existing
  `variant` state, `handleReset` (→ `template.variants.default`), and the PDF
  `capture` snapshot, all of which already carry the whole `Variant`.

Spacing presets are global (identical for every template), so — unlike the
color/font catalogs — they are **not** added to `TemplateVariants`; `App` passes
the shared `SPACING_PRESETS` constant directly. (YAGNI: no template needs a
subset today.)

## PDF safety

`calc(14pt * 1.75)` is resolved to a px used-value by the browser in
`getComputedStyle`, which is what html2canvas/jsPDF `doc.html()` read for
geometry. So the exported PDF stays true-vector and simply reflects the chosen
gap. No new fonts, images, or raster paths are introduced. The Atlas two-column
export (the sensitive path) is re-verified after implementation.

## Testing

- **`variants.test.ts`**: `SPACING_PRESETS` shape + `DEFAULT_SPACING_ID`;
  `resolveVariant` returns `sectionScale` 1 for default/absent, 0.5 for compact,
  1.75 for relaxed; unknown `spacingId` falls back to 1.
- **`theme.test.ts`**: `themeCssVars()["--sp-section-scale"]` is `"1"`;
  `themeCssVars({ sectionScale: 0.5 })["--sp-section-scale"]` is `"0.5"`.
- **`VariantPicker.test.tsx`**: renders `Compact`/`Default`/`Relaxed`; `Default`
  is pressed when `spacingId` absent; clicking `Relaxed` emits
  `{ colorId: "navy", fontId: "classic", spacingId: "relaxed" }`. Existing
  color/font assertions remain green (absent `spacingId` ⇒ unchanged emissions).
- **One template preview test** (Classic or Meridian): passing
  `variant={{ colorId, fontId, spacingId: "relaxed" }}` sets
  `--sp-section-scale: 1.75` on `.resume-page`.
- Full suite + `pnpm build` (0 errors) + Atlas PDF re-verification.

## Non-goals

- No continuous slider (presets chosen).
- No control over intra-item spacing (item/bullet/heading gaps stay fixed).
- No per-template spacing catalogs; presets are global.
- No change to the popover trigger's label.
