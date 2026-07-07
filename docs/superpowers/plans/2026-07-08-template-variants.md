# Template Color + Font Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live in-builder picker that toggles the résumé template's color scheme (4) and font pairing (4), flowing the choice into the live preview and the exported PDF.

**Architecture:** A variant is design metadata (`{ colorId, fontId }`) kept separate from `ResumeData`, resolved to overrides of three existing CSS custom properties (`--c-accent`, `--f-sans`, `--f-serif`) that `themeCssVars()` already sets on `.resume-page`. Templates own their catalog; the app holds the selection in state, freezes it into the PDF capture snapshot, and unions the pairing's fonts into `usedFontIds` so they get embedded. The picker is app chrome (Tailwind) in a Style toolbar under the header — the résumé sheet itself is never restyled.

**Tech Stack:** Astro + React (browser-only islands), TypeScript, Tailwind, jsPDF `doc.html()`, Vitest + @testing-library/react. Package manager: pnpm.

## Global Constraints

- Package manager is **pnpm**. Run a single test file with `pnpm exec vitest run <path>`.
- Variants are **design metadata — never added to `ResumeData`** (same rule the per-field font system follows).
- **Default look must not change:** `DEFAULT_VARIANT = { colorId: "navy", fontId: "classic" }` must resolve to today's exact values — accent `#1f3a5f`, `--f-sans` = `"Inter", system-ui, sans-serif`, `--f-serif` = `"SourceSerif", Georgia, serif`.
- **Reuse the existing 6-font library only** (`src/fonts/library.ts`). No new fonts, no new TTFs, no `gen:fonts`.
- **Font registration invariant is untouched:** variants only *select* already-registered library fonts; do not edit `registerFonts.ts` or `fontData.ts`.
- App chrome uses **Tailwind utility classes** (like the existing `<header>`); only `.resume-page`'s CSS variables change per variant.
- Exact font stacks (for assertions), from `src/fonts/library.ts`:
  - `inter` → `"Inter", system-ui, sans-serif`
  - `sourceSerif` → `"SourceSerif", Georgia, serif`
  - `playfair` → `"Playfair Display", Georgia, serif`
  - `plexSans` → `"IBM Plex Sans", system-ui, sans-serif`
  - `plexMono` → `"IBM Plex Mono", ui-monospace, monospace`

---

## File Structure

**New files**
- `src/theme/variants.ts` — the catalog (`COLOR_SCHEMES`, `FONT_PAIRINGS`, `DEFAULT_VARIANT`) + resolvers (`resolveVariant`, `resolveVariantFontIds`) + types (`ColorScheme`, `FontPairing`, `Variant`).
- `src/theme/variants.test.ts` — catalog integrity + resolver tests.
- `src/forms/VariantPicker.tsx` — presentational swatch/specimen picker.
- `src/forms/VariantPicker.test.tsx` — picker behavior tests.
- `src/theme/theme.test.ts` — tests for `themeCssVars` override merge (no existing test file).

**Modified files**
- `src/theme/theme.ts` — `themeCssVars(overrides?)` merges accent/font stacks over defaults.
- `src/fonts/overrides.ts` — `usedFontIds(overrides, baseIds?)` accepts the variant's base font ids.
- `src/fonts/overrides.test.ts` — extend for the `baseIds` argument.
- `src/templates/types.ts` — `Template.variants` + `Preview` gains optional `variant` prop.
- `src/templates/lazyTemplate.ts` — thread `variants` through `meta`; `variant` prop on module type.
- `src/templates/classic/index.ts` — attach the shared catalog.
- `src/templates/classic/index.test.tsx` — extend to assert the exposed variants.
- `src/templates/classic/ClassicPreview.tsx` — apply the variant to the root CSS vars.
- `src/templates/classic/ClassicPreview.test.tsx` — extend for variant CSS vars.
- `src/App.tsx` — variant state, Style toolbar, capture snapshot, reset.
- `src/App.test.tsx` — extend for live preview update, reset, and PDF font ids.
- `src/pdf/download.ts` — thread base font ids into `usedFontIds`.

---

## Task 1: Variant catalog module

**Files:**
- Create: `src/theme/variants.ts`
- Test: `src/theme/variants.test.ts`

**Interfaces:**
- Consumes: `fontStack`, `type FontId` from `src/fonts/library.ts`.
- Produces:
  - `interface ColorScheme { id: string; name: string; accent: string }`
  - `interface FontPairing { id: string; name: string; display: FontId; body: FontId }`
  - `interface Variant { colorId: string; fontId: string }`
  - `const COLOR_SCHEMES: ColorScheme[]` (navy, charcoal, burgundy, forest)
  - `const FONT_PAIRINGS: FontPairing[]` (classic, editorial, modern, mono)
  - `const DEFAULT_VARIANT: Variant`
  - `resolveVariant(v: Variant): { accent: string; displayStack: string; bodyStack: string }`
  - `resolveVariantFontIds(v: Variant): FontId[]`

- [ ] **Step 1: Write the failing test**

Create `src/theme/variants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT,
  resolveVariant, resolveVariantFontIds, type Variant,
} from "./variants";
import { getFont } from "../fonts/library";

describe("variant catalog", () => {
  it("ships 4 color schemes and 4 font pairings with unique ids", () => {
    expect(COLOR_SCHEMES.map((c) => c.id)).toEqual(["navy", "charcoal", "burgundy", "forest"]);
    expect(FONT_PAIRINGS.map((f) => f.id)).toEqual(["classic", "editorial", "modern", "mono"]);
    expect(new Set(COLOR_SCHEMES.map((c) => c.id)).size).toBe(4);
    expect(new Set(FONT_PAIRINGS.map((f) => f.id)).size).toBe(4);
  });

  it("references only real library fonts", () => {
    for (const f of FONT_PAIRINGS) {
      expect(getFont(f.display)).toBeDefined();
      expect(getFont(f.body)).toBeDefined();
    }
  });

  it("has a default that reproduces today's look (navy + Source Serif + Inter)", () => {
    expect(DEFAULT_VARIANT).toEqual({ colorId: "navy", fontId: "classic" });
    expect(resolveVariant(DEFAULT_VARIANT)).toEqual({
      accent: "#1f3a5f",
      displayStack: '"SourceSerif", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
    });
  });

  it("resolves a non-default variant to its accent and font stacks", () => {
    expect(resolveVariant({ colorId: "burgundy", fontId: "editorial" })).toEqual({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
    });
  });

  it("falls back to the default for unknown ids", () => {
    expect(resolveVariant({ colorId: "bogus", fontId: "bogus" } as Variant)).toEqual(
      resolveVariant(DEFAULT_VARIANT),
    );
  });

  it("returns the display+body font ids for embedding, deduped", () => {
    expect(new Set(resolveVariantFontIds({ colorId: "navy", fontId: "mono" }))).toEqual(
      new Set(["plexMono", "inter"]),
    );
    // Modern uses one family for both slots.
    expect(resolveVariantFontIds({ colorId: "navy", fontId: "modern" })).toEqual(["plexSans"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/theme/variants.test.ts`
Expected: FAIL — cannot resolve `./variants`.

- [ ] **Step 3: Write minimal implementation**

Create `src/theme/variants.ts`:

```ts
/**
 * Template variants — design metadata kept SEPARATE from ResumeData (same as
 * per-field font overrides). A Variant selects one color scheme + one font
 * pairing; resolveVariant turns that selection into concrete CSS values for
 * themeCssVars(), and resolveVariantFontIds lists the fonts the PDF must embed.
 *
 * "display" fills the --f-serif slot (the name/display font); "body" fills the
 * --f-sans slot (body text + headings). The role names are intentional: Modern
 * and Mono put a sans/mono face in the display slot.
 */
import { fontStack, type FontId } from "../fonts/library";

export interface ColorScheme {
  id: string;
  name: string;
  /** Accent color (--c-accent): headline, section headings, org names, bullets. */
  accent: string;
}

export interface FontPairing {
  id: string;
  name: string;
  /** Display/name font — fills the --f-serif slot. */
  display: FontId;
  /** Body + headings font — fills the --f-sans slot. */
  body: FontId;
}

/** The current variant selection. */
export interface Variant {
  colorId: string;
  fontId: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: "navy", name: "Navy", accent: "#1f3a5f" },
  { id: "charcoal", name: "Charcoal", accent: "#2b2f36" },
  { id: "burgundy", name: "Burgundy", accent: "#7c2d3a" },
  { id: "forest", name: "Forest", accent: "#285043" },
];

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "classic", name: "Classic", display: "sourceSerif", body: "inter" },
  { id: "editorial", name: "Editorial", display: "playfair", body: "inter" },
  { id: "modern", name: "Modern", display: "plexSans", body: "plexSans" },
  { id: "mono", name: "Mono", display: "plexMono", body: "inter" },
];

export const DEFAULT_VARIANT: Variant = { colorId: "navy", fontId: "classic" };

const COLOR_BY_ID = new Map(COLOR_SCHEMES.map((c) => [c.id, c]));
const FONT_BY_ID = new Map(FONT_PAIRINGS.map((f) => [f.id, f]));

function colorScheme(id: string): ColorScheme {
  return COLOR_BY_ID.get(id) ?? COLOR_BY_ID.get(DEFAULT_VARIANT.colorId)!;
}
function fontPairing(id: string): FontPairing {
  return FONT_BY_ID.get(id) ?? FONT_BY_ID.get(DEFAULT_VARIANT.fontId)!;
}

/** Resolve a selection to concrete CSS values for themeCssVars(). Total: unknown ids fall back to the default. */
export function resolveVariant(v: Variant): {
  accent: string;
  displayStack: string;
  bodyStack: string;
} {
  const c = colorScheme(v.colorId);
  const f = fontPairing(v.fontId);
  return {
    accent: c.accent,
    displayStack: fontStack(f.display),
    bodyStack: fontStack(f.body),
  };
}

/** The font ids a variant needs embedded in the PDF (display + body, deduped). */
export function resolveVariantFontIds(v: Variant): FontId[] {
  const f = fontPairing(v.fontId);
  return [...new Set<FontId>([f.display, f.body])];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/theme/variants.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/theme/variants.ts src/theme/variants.test.ts
git commit -m "feat: add template variant catalog (colors + font pairings)"
```

---

## Task 2: `themeCssVars` accepts variant overrides

**Files:**
- Modify: `src/theme/theme.ts:89-137` (the `themeCssVars` function)
- Test: `src/theme/theme.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `themeCssVars(overrides?: { accent?: string; displayStack?: string; bodyStack?: string }): StyleWithVars`. When a field is present it replaces `--c-accent` / `--f-serif` / `--f-sans` respectively; absent → today's theme default.

- [ ] **Step 1: Write the failing test**

Create `src/theme/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { themeCssVars } from "./theme";

describe("themeCssVars", () => {
  it("returns today's defaults when called with no overrides", () => {
    const v = themeCssVars();
    expect(v["--c-accent"]).toBe("#1f3a5f");
    expect(v["--f-sans"]).toBe('"Inter", system-ui, sans-serif');
    expect(v["--f-serif"]).toBe('"SourceSerif", Georgia, serif');
  });

  it("merges variant overrides over the accent and font vars", () => {
    const v = themeCssVars({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"IBM Plex Sans", system-ui, sans-serif',
    });
    expect(v["--c-accent"]).toBe("#7c2d3a");
    expect(v["--f-serif"]).toBe('"Playfair Display", Georgia, serif');
    expect(v["--f-sans"]).toBe('"IBM Plex Sans", system-ui, sans-serif');
    // Untouched vars still come from the theme.
    expect(v["--c-ink"]).toBe("#1b1b1f");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: FAIL — the second test fails because `themeCssVars` ignores its argument (accent stays `#1f3a5f`).

- [ ] **Step 3: Write minimal implementation**

In `src/theme/theme.ts`, replace the `themeCssVars` signature and the three affected lines. Change the signature line:

```ts
export function themeCssVars(overrides?: {
  accent?: string;
  displayStack?: string;
  bodyStack?: string;
}): StyleWithVars {
  const t = theme;
  return {
```

Then change these three property lines inside the returned object:

```ts
    "--c-accent": overrides?.accent ?? t.color.accent,
```
```ts
    "--f-sans": overrides?.bodyStack ?? `"${t.font.sans}", system-ui, sans-serif`,
    "--f-serif": overrides?.displayStack ?? `"${t.font.serif}", Georgia, serif`,
```

Leave every other property line unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/theme/theme.ts src/theme/theme.test.ts
git commit -m "feat: let themeCssVars merge variant accent/font overrides"
```

---

## Task 3: `usedFontIds` accepts base font ids

**Files:**
- Modify: `src/fonts/overrides.ts:36-42` (the `usedFontIds` function)
- Test: `src/fonts/overrides.test.ts:24-34` (extend the `usedFontIds` describe block)

**Interfaces:**
- Consumes: `BASELINE_FONT_IDS`, `getFont`, `type FontId` (already in the module).
- Produces: `usedFontIds(overrides: FontOverrides, baseIds?: FontId[]): FontId[]` — unions `baseIds` (default `BASELINE_FONT_IDS`) with the known per-field override fonts.

- [ ] **Step 1: Write the failing test**

In `src/fonts/overrides.test.ts`, add a test inside the existing `describe("usedFontIds", ...)` block (after the existing `it` cases):

```ts
  it("unions caller-supplied base ids with override fonts", () => {
    expect(new Set(usedFontIds({ name: "lora" }, ["playfair", "inter"]))).toEqual(
      new Set(["playfair", "inter", "lora"]),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/fonts/overrides.test.ts`
Expected: FAIL — `usedFontIds` ignores the second argument, so `playfair` is absent (baseline is inter/sourceSerif).

- [ ] **Step 3: Write minimal implementation**

In `src/fonts/overrides.ts`, replace the `usedFontIds` function body:

```ts
/** The unique, known fonts that must be embedded for a given override set. */
export function usedFontIds(
  overrides: FontOverrides,
  baseIds: FontId[] = BASELINE_FONT_IDS,
): FontId[] {
  const set = new Set<FontId>(baseIds);
  for (const id of Object.values(overrides)) {
    if (getFont(id)) set.add(id);
  }
  return [...set];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/fonts/overrides.test.ts`
Expected: PASS (the existing `usedFontIds({})` case still equals `BASELINE_FONT_IDS`, plus the new case).

- [ ] **Step 5: Commit**

```bash
git add src/fonts/overrides.ts src/fonts/overrides.test.ts
git commit -m "feat: usedFontIds accepts caller-supplied base font ids"
```

---

## Task 4: Template type + classic template variants

**Files:**
- Modify: `src/templates/types.ts` (add `TemplateVariants`, `Template.variants`, `variant` prop)
- Modify: `src/templates/lazyTemplate.ts` (thread `variants` through `meta`; add `variant` to module prop type)
- Modify: `src/templates/classic/index.ts` (attach the shared catalog)
- Test: `src/templates/classic/index.test.tsx` (extend)

**Interfaces:**
- Consumes: `ColorScheme`, `FontPairing`, `Variant` from Task 1; `COLOR_SCHEMES`, `FONT_PAIRINGS`, `DEFAULT_VARIANT`.
- Produces:
  - `interface TemplateVariants { colors: ColorScheme[]; fonts: FontPairing[]; default: Variant }`
  - `Template.variants: TemplateVariants`
  - `Template.Preview` / `preload` component prop type gains optional `variant?: Variant`.
  - `classicTemplate.variants` populated from the shared catalog.

- [ ] **Step 1: Write the failing test**

In `src/templates/classic/index.test.tsx`, add a new `describe` block at the end of the file:

```ts
import { COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT } from "../../theme/variants";

describe("classic template variants", () => {
  it("exposes the shared color + font catalog and the default selection", () => {
    expect(classicTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(classicTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(classicTemplate.variants.default).toEqual(DEFAULT_VARIANT);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/templates/classic/index.test.tsx`
Expected: FAIL — `classicTemplate.variants` is `undefined` (and a TypeScript error that `variants` is missing).

- [ ] **Step 3: Write minimal implementation**

In `src/templates/types.ts`, add imports and the `TemplateVariants` interface near the top (after the existing imports):

```ts
import type { ColorScheme, FontPairing, Variant } from "../theme/variants";

export interface TemplateVariants {
  colors: ColorScheme[];
  fonts: FontPairing[];
  default: Variant;
}
```

Add `variants` to the `Template` interface and `variant` to the two component prop types. The `Preview` field becomes:

```ts
  Preview: ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }>;
```

The `preload` return type becomes:

```ts
  preload: () => Promise<ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }>>;
```

Add the field (put it after `schema`):

```ts
  /** The color schemes + font pairings this template offers, plus its default. */
  variants: TemplateVariants;
```

In `src/templates/lazyTemplate.ts`, add the import and thread `variants`. Update the `PreviewModule` type:

```ts
type PreviewModule = {
  default: ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }>;
};
```

Add the import at the top:

```ts
import type { Variant } from "../theme/variants";
import type { Template, TemplateVariants } from "./types";
```

(Replace the existing `import type { Template } from "./types";` line with the combined one above.)

Update the `meta` parameter type and the returned object:

```ts
export function lazyTemplate(
  meta: {
    id: string;
    name: string;
    description?: string;
    schema: FormSchema<ResumeData>;
    variants: TemplateVariants;
  },
  load: () => Promise<PreviewModule>,
): Template {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    schema: meta.schema,
    variants: meta.variants,
    Preview: lazy(load),
    preload: () => load().then((m) => m.default),
  };
}
```

In `src/templates/classic/index.ts`, import the catalog and pass `variants`:

```ts
import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "./schema";
import { COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT } from "../../theme/variants";

export const classicTemplate = lazyTemplate(
  {
    id: "classic",
    name: "Classic",
    description: "Single-column, editorial serif",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: DEFAULT_VARIANT },
  },
  () => import("./ClassicPreview"),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/templates/classic/index.test.tsx`
Expected: PASS (existing 2 tests + the new one).

- [ ] **Step 5: Commit**

```bash
git add src/templates/types.ts src/templates/lazyTemplate.ts src/templates/classic/index.ts src/templates/classic/index.test.tsx
git commit -m "feat: templates carry their variant catalog"
```

---

## Task 5: `ClassicPreview` applies the variant

**Files:**
- Modify: `src/templates/classic/ClassicPreview.tsx:22-33` (props + root style)
- Test: `src/templates/classic/ClassicPreview.test.tsx` (extend)

**Interfaces:**
- Consumes: `resolveVariant`, `DEFAULT_VARIANT`, `type Variant` (Task 1); `themeCssVars(overrides)` (Task 2).
- Produces: `ClassicPreview` accepts `variant?: Variant` (default `DEFAULT_VARIANT`) and sets `--c-accent` / `--f-sans` / `--f-serif` on `.resume-page` accordingly.

- [ ] **Step 1: Write the failing test**

In `src/templates/classic/ClassicPreview.test.tsx`, add a new `describe` block at the end:

```ts
describe("ClassicPreview variants", () => {
  it("applies the selected color + font pairing to the page root", () => {
    const { container } = render(
      <ClassicPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
    expect(page.style.getPropertyValue("--f-sans")).toBe('"Inter", system-ui, sans-serif');
  });

  it("defaults to today's navy + Source Serif look when no variant is passed", () => {
    const { container } = render(<ClassicPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("lets a per-field font override still win over the pairing", () => {
    render(
      <ClassicPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora" }}
      />,
    );
    const name = screen.getByRole("heading", { name: sampleResume.name });
    expect(name).toHaveStyle({ fontFamily: '"Lora", Georgia, serif' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/templates/classic/ClassicPreview.test.tsx`
Expected: FAIL — `--c-accent` is still `#1f3a5f` for the burgundy case because `variant` is ignored.

- [ ] **Step 3: Write minimal implementation**

In `src/templates/classic/ClassicPreview.tsx`, add the import (next to the existing `themeCssVars` import):

```ts
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
```

Update the component signature and the root element. Replace the props destructuring / signature:

```tsx
export function ClassicPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: ResumeData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page" style={themeCssVars(resolveVariant(variant))}>
```

(Only the signature and the `<div className="resume-page" ...>` opening tag change; the rest of the JSX is unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/templates/classic/ClassicPreview.test.tsx`
Expected: PASS (existing 3 tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/templates/classic/ClassicPreview.tsx src/templates/classic/ClassicPreview.test.tsx
git commit -m "feat: ClassicPreview renders the selected variant"
```

---

## Task 6: `VariantPicker` component

**Files:**
- Create: `src/forms/VariantPicker.tsx`
- Test: `src/forms/VariantPicker.test.tsx`

**Interfaces:**
- Consumes: `ColorScheme`, `FontPairing`, `Variant` (Task 1); `fontStack` from `src/fonts/library.ts`; `cn` from `src/lib/utils.ts`.
- Produces: `VariantPicker({ colors, fonts, value, onChange })` — a color-swatch group + a font-specimen group. Each option is a `<button>` with an accessible name (scheme/pairing `name`), `aria-pressed` reflecting the active id, and an `onChange` that emits a new `Variant` with only the changed axis replaced.

- [ ] **Step 1: Write the failing test**

Create `src/forms/VariantPicker.test.tsx`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariantPicker } from "./VariantPicker";
import { COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT } from "@/theme/variants";

function renderPicker(onChange = vi.fn()) {
  render(
    <VariantPicker
      colors={COLOR_SCHEMES}
      fonts={FONT_PAIRINGS}
      value={DEFAULT_VARIANT}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("VariantPicker", () => {
  it("renders a swatch per color and a specimen per font pairing", () => {
    renderPicker();
    for (const name of ["Navy", "Charcoal", "Burgundy", "Forest"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    for (const name of ["Classic", "Editorial", "Modern", "Mono"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("marks the active color and font as pressed", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: "Navy" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Burgundy" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Classic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("emits a new variant with only the changed axis replaced", () => {
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Burgundy" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "burgundy", fontId: "classic" });
    fireEvent.click(screen.getByRole("button", { name: "Editorial" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "navy", fontId: "editorial" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/forms/VariantPicker.test.tsx`
Expected: FAIL — cannot resolve `./VariantPicker`.

- [ ] **Step 3: Write minimal implementation**

Create `src/forms/VariantPicker.tsx`:

```tsx
import type { ColorScheme, FontPairing, Variant } from "@/theme/variants";
import { fontStack } from "@/fonts/library";
import { cn } from "@/lib/utils";

export interface VariantPickerProps {
  colors: ColorScheme[];
  fonts: FontPairing[];
  value: Variant;
  onChange: (next: Variant) => void;
}

/**
 * Template-wide color + font picker. Each option is its own live demo: the color
 * swatch is filled with its accent, the font button renders its name in that
 * pairing's display font. Selecting one emits a new Variant with only the
 * changed axis replaced; the live preview re-renders instantly.
 */
export function VariantPicker({ colors, fonts, value, onChange }: VariantPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div role="group" aria-label="Color scheme" className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Color</span>
        <div className="flex items-center gap-1.5">
          {colors.map((c) => {
            const active = c.id === value.colorId;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                aria-pressed={active}
                title={c.name}
                onClick={() => onChange({ ...value, colorId: c.id })}
                className={cn(
                  "size-5 rounded-full ring-offset-2 ring-offset-background transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "ring-2 ring-foreground"
                    : "ring-1 ring-border hover:ring-foreground/40",
                )}
                style={{ backgroundColor: c.accent }}
              />
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="Font pairing" className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Font</span>
        <div className="flex items-center gap-1.5">
          {fonts.map((fp) => {
            const active = fp.id === value.fontId;
            return (
              <button
                key={fp.id}
                type="button"
                aria-label={fp.name}
                aria-pressed={active}
                onClick={() => onChange({ ...value, fontId: fp.id })}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-sm leading-none transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/40",
                )}
                style={{ fontFamily: fontStack(fp.display) }}
              >
                {fp.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/forms/VariantPicker.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/forms/VariantPicker.tsx src/forms/VariantPicker.test.tsx
git commit -m "feat: add VariantPicker (color swatches + font specimens)"
```

---

## Task 7: Wire variants through App + PDF export

**Files:**
- Modify: `src/pdf/download.ts` (thread base font ids into `usedFontIds`)
- Modify: `src/App.tsx` (variant state, Style toolbar, capture snapshot, reset)
- Test: `src/App.test.tsx` (extend)

**Interfaces:**
- Consumes: `VariantPicker` (Task 6); `resolveVariantFontIds`, `type Variant`, and each template's `variants` (Tasks 1, 4); `usedFontIds(overrides, baseIds)` (Task 3).
- Produces: `downloadResumePdf(element, filename?, overrides?, baseFontIds?: FontId[])`; the App renders the picker, updates the live preview, freezes the variant into the capture, and passes the variant's font ids as the 4th `downloadResumePdf` argument.

- [ ] **Step 1: Write the failing test**

In `src/App.test.tsx`, add these tests inside the existing `describe("App", ...)` block (after the last `it`):

```ts
  it("applies a color + font variant to the live preview", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const page = document.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");

    fireEvent.click(screen.getByRole("button", { name: "Burgundy" }));
    fireEvent.click(screen.getByRole("button", { name: "Editorial" }));

    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("resets the variant to the template default", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const page = document.querySelector(".resume-page") as HTMLElement;

    fireEvent.click(screen.getByRole("button", { name: "Forest" }));
    expect(page.style.getPropertyValue("--c-accent")).toBe("#285043");

    fireEvent.click(screen.getByRole("button", { name: /reset sample/i }));
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
  });

  it("passes the variant's fonts to the PDF export", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    fireEvent.click(screen.getByRole("button", { name: "Mono" }));

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    expect(new Set(vi.mocked(downloadResumePdf).mock.calls[0][3])).toEqual(
      new Set(["plexMono", "inter"]),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL — no "Burgundy" button exists yet (picker not rendered).

- [ ] **Step 3: Write minimal implementation**

In `src/pdf/download.ts`, add the `FontId` import next to the existing overrides import:

```ts
import { usedFontIds, type FontOverrides } from "../fonts/overrides";
import type { FontId } from "../fonts/library";
```

Change `renderResumeDoc` to accept and use `baseFontIds`. Update its signature:

```ts
async function renderResumeDoc(
  element: HTMLElement,
  overrides: FontOverrides,
  baseFontIds?: FontId[],
): Promise<jsPDF> {
```

and the `used` line inside it:

```ts
  const used = usedFontIds(overrides, baseFontIds);
```

Change `downloadResumePdf`:

```ts
export async function downloadResumePdf(
  element: HTMLElement,
  filename = "resume.pdf",
  overrides: FontOverrides = {},
  baseFontIds?: FontId[],
): Promise<void> {
  const doc = await renderResumeDoc(element, overrides, baseFontIds);
  doc.save(filename);
}
```

In `src/App.tsx`, add imports (next to the existing font/override imports):

```ts
import { VariantPicker } from "./forms/VariantPicker";
import { resolveVariantFontIds, type Variant } from "./theme/variants";
```

Add variant state (after the `fontOverrides` state):

```ts
  const [variant, setVariant] = useState<Variant>(() => template.variants.default);
```

Update the `capture` state type to carry the variant:

```ts
  const [capture, setCapture] = useState<
    {
      data: any;
      fontOverrides: FontOverrides;
      variant: Variant;
      Comp: ComponentType<{ data: any; fontOverrides?: FontOverrides; variant?: Variant }>;
    } | null
  >(null);
```

In the download effect, pass the variant's fonts as the 4th argument:

```ts
        await downloadResumePdf(host, "resume.pdf", capture.fontOverrides, resolveVariantFontIds(capture.variant));
```

In `handleDownload`, freeze the variant into the snapshot:

```ts
      setCapture({ data, fontOverrides, variant, Comp }); // freeze content + fonts + variant + mount the offscreen copy
```

In `handleReset`, restore the default variant:

```ts
  const handleReset = () => {
    setData(doc.defaultData);
    setFontOverrides({});
    setVariant(template.variants.default);
  };
```

Render the Style toolbar directly after the closing `</header>` tag (before the `{error && ...}` alert):

```tsx
      <div className="style-bar flex shrink-0 flex-wrap items-center gap-4 border-b bg-background px-5 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Style
        </span>
        <VariantPicker
          colors={template.variants.colors}
          fonts={template.variants.fonts}
          value={variant}
          onChange={setVariant}
        />
      </div>
```

Pass `variant` to the live preview:

```tsx
              <Suspense fallback={<div className="template-loading" aria-hidden />}>
                <Preview data={data} fontOverrides={fontOverrides} variant={variant} />
              </Suspense>
```

Pass `variant` to the offscreen capture copy:

```tsx
          <capture.Comp data={capture.data} fontOverrides={capture.fontOverrides} variant={capture.variant} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS (existing 6 tests + 3 new). The existing "passes the chosen overrides to the PDF export" test still passes because it only inspects the 3rd argument.

- [ ] **Step 5: Run the full suite + type-check**

Run: `pnpm test`
Expected: PASS — whole suite green.

Run: `pnpm build`
Expected: `astro check` reports 0 errors and the static build completes.

- [ ] **Step 6: Commit**

```bash
git add src/pdf/download.ts src/App.tsx src/App.test.tsx
git commit -m "feat: variant Style toolbar wired into preview and PDF export"
```

---

## Manual verification (after Task 7)

The variant → PDF path is browser-only, so confirm it against the source-of-truth build (per CLAUDE.md, `pnpm dev` is NOT authoritative for PDF output):

```bash
pnpm build && pnpm preview
```

Then in the browser at the builder route (`/build/resume/classic`):
1. The Style toolbar shows 4 color swatches + 4 font specimen buttons under the header.
2. Clicking a swatch/specimen updates the preview instantly (accent color; name/body fonts).
3. Pick **Editorial** (Playfair) + **Burgundy**, click **Download PDF**, and verify the exported file:

```bash
pdffonts resume.pdf                    # expect PlayfairDisplay + Inter "emb yes ... uni yes"
pdftotext resume.pdf -                 # prints real selectable text (proves not an image)
node scripts/inspect-pdf.mjs resume.pdf  # VECTOR verdict, embedded fonts, zero images
```
4. Click **Reset sample** → toolbar returns to Navy + Classic and the preview reverts.

---

## Self-Review

**Spec coverage:**
- Catalog (4 colors × 4 fonts, accent-only, reuse library) → Task 1. ✓
- `themeCssVars` merge → Task 2. ✓
- Templates own variants + `Preview` variant prop → Task 4. ✓
- `ClassicPreview` applies variant; per-field override still wins → Task 5. ✓
- Live picker in a Style toolbar under the header → Task 6 + Task 7. ✓
- App state + freeze variant into capture + reset → Task 7. ✓
- PDF font embedding (`usedFontIds` base ids + `download.ts` + `resolveVariantFontIds`) → Tasks 3, 7. ✓
- Default look unchanged / metadata out of `ResumeData` / font-registration invariant untouched → Global Constraints, verified by Task 1 & Task 5 default-look tests. ✓
- Manual PDF verification → Manual verification section. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code. ✓

**Type consistency:** `Variant`, `ColorScheme`, `FontPairing`, `TemplateVariants` defined in Tasks 1/4 and used with the same names/shapes throughout. `resolveVariant` returns `{ accent, displayStack, bodyStack }` and is consumed by `themeCssVars({ accent?, displayStack?, bodyStack? })` — field names match. `resolveVariantFontIds` returns `FontId[]`, consumed as `downloadResumePdf`'s 4th arg → `usedFontIds(overrides, baseIds)`. `VariantPicker` prop names (`colors`, `fonts`, `value`, `onChange`) match its call site in Task 7. ✓
