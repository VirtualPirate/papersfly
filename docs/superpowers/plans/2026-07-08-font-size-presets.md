# Font-Size Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth template-styling axis — a font-size preset (Small / Medium / Large) — to the Style popover, scaling each template's whole type scale (sizes + leading) proportionally across all five templates, persisting into the PDF automatically.

**Architecture:** A new optional `sizeId` on `Variant` (absent ⇒ `medium`). `resolveVariant()` maps it to a unitless `fontScale`; `themeCssVars()` emits `--s-font-scale` and rewrites the `--s-*` size + `--lh-*` leading tokens as `calc(<base>pt * var(--s-font-scale))`, so token-based templates scale for free. Hardcoded `pt` literals in Quill/Ledger/Atlas wrap the same token. The picker gets a "Size" section; `App` threads the global `SIZE_PRESETS`. Medium (scale 1) reproduces today's output exactly.

**Tech Stack:** Astro + React (client islands), TypeScript, plain side-effect-imported CSS, Vitest + @testing-library/react, jsPDF `doc.html()`.

## Global Constraints

- **Package manager: pnpm.** Single file: `pnpm exec vitest run <path>`; full suite: `pnpm exec vitest run`; type-check + build: `pnpm build` (runs `astro check`).
- **Path alias:** `@` → `src`. Theme/template code uses relative imports; tests use `@/…` (match the file being edited).
- **The rendered DOM is the PDF source.** A CSS var change flows to the export automatically.
- **Scale token is unitless; multiply `pt` bases via `calc()`.** Always use the `var(--s-font-scale, 1)` fallback form in the CSS literal wraps.
- **Medium must be pixel-identical to today.** Scale `1` ⇒ `calc(base * 1)` = `base`. Do not change any base value.
- **Scope is the whole type scale** (all `--s-*` + `--lh-*` + the hardcoded literals). Do NOT scale decorative fixed offsets (e.g. Ledger's bullet `::before { top: 4.6pt }`).
- **`sizeId` is OPTIONAL on `Variant`.** Every existing `{ colorId, fontId }` / `{ …, spacingId }` literal and `DEFAULT_VARIANT` must stay unchanged.
- **Preset labels are Small / Medium / Large** — never "Default" (that would collide with the Spacing row's Default button).
- **Commits:** The USER handles all git commits. Do NOT run `git commit`. End each task by running its tests green and pausing for review.

---

## Task 1: Add the size-preset axis to the variant model

**Files:**
- Modify: `src/theme/variants.ts`
- Modify: `src/theme/variants.test.ts`

**Interfaces:**
- Produces: `SizePreset` interface; `SIZE_PRESETS: SizePreset[]`; `DEFAULT_SIZE_ID: string`; `Variant.sizeId?: string`; `resolveVariant(v)` return gains `fontScale: number`.

- [ ] **Step 1: Update the existing tests + add size tests** — in `src/theme/variants.test.ts`:

Extend the import:

```ts
import {
  COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT,
  SPACING_PRESETS, DEFAULT_SPACING_ID,
  SIZE_PRESETS, DEFAULT_SIZE_ID,
  resolveVariant, resolveVariantFontIds, type Variant,
} from "./variants";
```

Add `fontScale: 1` to the two existing `resolveVariant` `toEqual` assertions (they already carry `sectionScale: 1`). The default test becomes:

```ts
    expect(resolveVariant(DEFAULT_VARIANT)).toEqual({
      accent: "#1f3a5f",
      displayStack: '"SourceSerif", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
      sectionScale: 1,
      fontScale: 1,
    });
```

The non-default test becomes:

```ts
    expect(resolveVariant({ colorId: "burgundy", fontId: "editorial" })).toEqual({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
      sectionScale: 1,
      fontScale: 1,
    });
```

Append a new describe block:

```ts
describe("size presets", () => {
  it("ships small/medium/large with unique ids and a default id", () => {
    expect(SIZE_PRESETS.map((s) => s.id)).toEqual(["small", "medium", "large"]);
    expect(new Set(SIZE_PRESETS.map((s) => s.id)).size).toBe(3);
    expect(DEFAULT_SIZE_ID).toBe("medium");
  });

  it("resolves sizeId to a font scale, defaulting to 1 when absent", () => {
    expect(resolveVariant({ colorId: "navy", fontId: "classic" }).fontScale).toBe(1);
    expect(resolveVariant({ colorId: "navy", fontId: "classic", sizeId: "small" }).fontScale).toBe(0.9);
    expect(resolveVariant({ colorId: "navy", fontId: "classic", sizeId: "large" }).fontScale).toBe(1.1);
  });

  it("falls back to the default scale for an unknown sizeId", () => {
    expect(resolveVariant({ colorId: "navy", fontId: "classic", sizeId: "bogus" }).fontScale).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/theme/variants.test.ts`
Expected: FAIL (`SIZE_PRESETS`/`DEFAULT_SIZE_ID` undefined; `fontScale` missing).

- [ ] **Step 3: Implement the model** — in `src/theme/variants.ts`:

Add the interface after `SpacingPreset`:

```ts
export interface SizePreset {
  id: string;
  name: string;
  /** Unitless multiplier applied to every font size + leading. */
  scale: number;
}
```

Add `sizeId` to `Variant` (after `spacingId`):

```ts
  /** Font-size preset id; absent ⇒ DEFAULT_SIZE_ID (scale 1). */
  sizeId?: string;
```

Add the catalog after `SPACING_PRESETS`:

```ts
export const SIZE_PRESETS: SizePreset[] = [
  { id: "small",  name: "Small",  scale: 0.9 },
  { id: "medium", name: "Medium", scale: 1 },
  { id: "large",  name: "Large",  scale: 1.1 },
];
```

Add `DEFAULT_SIZE_ID` next to `DEFAULT_SPACING_ID`:

```ts
export const DEFAULT_SIZE_ID = "medium";
```

Add a lookup + helper next to `SPACING_BY_ID`/`spacingPreset`:

```ts
const SIZE_BY_ID = new Map(SIZE_PRESETS.map((s) => [s.id, s]));

function sizePreset(id: string | undefined): SizePreset {
  return SIZE_BY_ID.get(id ?? DEFAULT_SIZE_ID) ?? SIZE_BY_ID.get(DEFAULT_SIZE_ID)!;
}
```

Extend `resolveVariant`'s return type and body:

```ts
export function resolveVariant(v: Variant): {
  accent: string;
  displayStack: string;
  bodyStack: string;
  sectionScale: number;
  fontScale: number;
} {
  const c = colorScheme(v.colorId);
  const f = fontPairing(v.fontId);
  const s = spacingPreset(v.spacingId);
  const z = sizePreset(v.sizeId);
  return {
    accent: c.accent,
    displayStack: fontStack(f.display),
    bodyStack: fontStack(f.body),
    sectionScale: s.scale,
    fontScale: z.scale,
  };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm exec vitest run src/theme/variants.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 2: Emit `--s-font-scale` and make the size/leading tokens scale-aware

**Files:**
- Modify: `src/theme/theme.ts`
- Modify: `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `resolveVariant`'s `fontScale` (Task 1).
- Produces: `themeCssVars()` output includes `"--s-font-scale"` (string, default `"1"`), and the eight `--s-*` + two `--lh-*` tokens become `calc(<base>pt * var(--s-font-scale))` strings.

- [ ] **Step 1: Write the failing tests** — append inside the existing `describe("themeCssVars", …)` in `src/theme/theme.test.ts`:

```ts
  it("emits a default font scale of 1, overridable via fontScale", () => {
    expect(themeCssVars()["--s-font-scale"]).toBe("1");
    expect(themeCssVars({ fontScale: 0.9 })["--s-font-scale"]).toBe("0.9");
    expect(themeCssVars({ fontScale: 1.1 })["--s-font-scale"]).toBe("1.1");
  });

  it("makes size + leading tokens scale-aware via calc()", () => {
    const v = themeCssVars();
    expect(v["--s-body"]).toBe("calc(9.5pt * var(--s-font-scale))");
    expect(v["--s-name"]).toBe("calc(25pt * var(--s-font-scale))");
    expect(v["--lh-body"]).toBe("calc(12.4pt * var(--s-font-scale))");
  });
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: FAIL (`--s-font-scale` undefined; `--s-body` is `"9.5pt"`).

- [ ] **Step 3: Implement** — in `src/theme/theme.ts`, extend the `themeCssVars` overrides type:

```ts
export function themeCssVars(overrides?: {
  accent?: string;
  displayStack?: string;
  bodyStack?: string;
  sectionScale?: number;
  fontScale?: number;
}): StyleWithVars {
```

Add the scale token (place it just before the `--s-name` line):

```ts
    "--s-font-scale": String(overrides?.fontScale ?? 1),
```

Rewrite the eight size tokens and two leading tokens to `calc()` forms. Replace the existing block:

```ts
    "--s-name": `${t.size.name}pt`,
    "--s-headline": `${t.size.headline}pt`,
    "--s-contact": `${t.size.contact}pt`,
    "--s-section": `${t.size.section}pt`,
    "--s-role": `${t.size.role}pt`,
    "--s-org": `${t.size.org}pt`,
    "--s-date": `${t.size.date}pt`,
    "--s-body": `${t.size.body}pt`,

    "--lh-contact": `${t.leading.contact}pt`,
    "--lh-body": `${t.leading.body}pt`,
```

with:

```ts
    "--s-name": `calc(${t.size.name}pt * var(--s-font-scale))`,
    "--s-headline": `calc(${t.size.headline}pt * var(--s-font-scale))`,
    "--s-contact": `calc(${t.size.contact}pt * var(--s-font-scale))`,
    "--s-section": `calc(${t.size.section}pt * var(--s-font-scale))`,
    "--s-role": `calc(${t.size.role}pt * var(--s-font-scale))`,
    "--s-org": `calc(${t.size.org}pt * var(--s-font-scale))`,
    "--s-date": `calc(${t.size.date}pt * var(--s-font-scale))`,
    "--s-body": `calc(${t.size.body}pt * var(--s-font-scale))`,

    "--lh-contact": `calc(${t.leading.contact}pt * var(--s-font-scale))`,
    "--lh-body": `calc(${t.leading.body}pt * var(--s-font-scale))`,
```

(The `--s-font-scale` line must come *before* these so the inline style is easy to read; CSS resolves regardless of order.)

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: PASS (new + existing — no existing test asserts a `--s-*`/`--lh-*` value).

- [ ] **Step 5: Type-check + confirm token templates still render**

Run: `pnpm build`
Expected: 0 errors.
Run: `pnpm exec vitest run src/templates/classic src/templates/meridian`
Expected: PASS (Classic/Meridian scale for free; nothing asserts computed size).

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 3: Wrap the hardcoded font-size literals (Quill, Ledger, Atlas)

Only these three have raw `pt` sizes; Classic and Meridian already scale via Task 2's tokens.

**Files:**
- Modify: `src/templates/quill/quill.css`
- Modify: `src/templates/ledger/ledger.css`
- Modify: `src/templates/atlas/atlas.css`
- Modify: `src/templates/meridian/MeridianPreview.test.tsx`

**Interfaces:**
- Consumes: `--s-font-scale` (Task 2).

- [ ] **Step 1: Write the failing DOM test** — append inside `describe("MeridianPreview", …)` in `src/templates/meridian/MeridianPreview.test.tsx`:

```tsx
  it("flows the size preset to the page root as --s-font-scale", () => {
    const { container, rerender } = render(<MeridianPreview data={sampleResume} />);
    const page = () => container.querySelector(".resume-page") as HTMLElement;
    expect(page().style.getPropertyValue("--s-font-scale")).toBe("1");
    rerender(
      <MeridianPreview data={sampleResume} variant={{ colorId: "navy", fontId: "classic", sizeId: "large" }} />,
    );
    expect(page().style.getPropertyValue("--s-font-scale")).toBe("1.1");
  });
```

- [ ] **Step 2: Run it** — Task 2 already emits `--s-font-scale`, so this passes now; it is a regression guard.

Run: `pnpm exec vitest run src/templates/meridian/MeridianPreview.test.tsx`
Expected: PASS (if Task 2 done). If run before Task 2: FAIL.

- [ ] **Step 3: Edit `quill.css`** — wrap the name size (line ~18):

```css
  font-size: calc(26pt * var(--s-font-scale, 1)); line-height: 1.05; letter-spacing: 0.2pt; color: var(--c-ink);
```

- [ ] **Step 4: Edit `ledger.css`** — wrap every `font-size` literal and the body `line-height: 11.6pt`. Exact replacements:

```css
/* .resume-page.ledger */  font-size: calc(8.8pt * var(--s-font-scale, 1));
/* .resume-page.ledger */  line-height: calc(11.6pt * var(--s-font-scale, 1));
/* .ledger .resume-name */ font-size: calc(20pt * var(--s-font-scale, 1)); line-height: 1.02; color: var(--c-ink);
/* .ldg-headline */        margin: 3pt 0 0; font-size: calc(9.5pt * var(--s-font-scale, 1)); font-weight: 600; color: var(--c-accent);
/* .ldg-contact */         text-align: right; font-size: calc(8pt * var(--s-font-scale, 1)); color: var(--c-muted);
/* .ldg-sec-h */           margin: 0; font-size: calc(8.4pt * var(--s-font-scale, 1)); text-transform: uppercase; letter-spacing: 0.8pt;
/* .ldg-role */            .ldg-role { font-weight: 600; font-size: calc(9pt * var(--s-font-scale, 1)); color: var(--c-ink); }
/* .ldg-org */             .ldg-org { color: var(--c-accent); font-size: calc(8.8pt * var(--s-font-scale, 1)); }
/* .ldg-date */            flex: none; font-size: calc(8pt * var(--s-font-scale, 1)); color: var(--c-faint);
/* .ldg-detail */          .ldg-detail { margin-top: 2pt; font-size: calc(8.4pt * var(--s-font-scale, 1)); color: var(--c-muted); }
```

Leave the unitless line-heights (`1.5`, `1.35`, `1.3`, `1.02`) and the bullet `::before { top: 4.6pt }` unchanged.

- [ ] **Step 5: Edit `atlas.css`** — wrap the name + seven sidebar literals:

```css
/* .atlas .resume-name */  font-size: calc(20pt * var(--s-font-scale, 1)); line-height: 1.05; color: var(--c-accent);
/* .atl-h */               .atl-h { margin: 0 0 6pt; font-size: calc(8.6pt * var(--s-font-scale, 1)); text-transform: uppercase; letter-spacing: 1pt; font-weight: 700; color: var(--c-accent); }
/* .atl-contact-line */    .atl-contact-line { font-size: calc(8.6pt * var(--s-font-scale, 1)); color: var(--c-muted); line-height: var(--lh-contact); margin-top: 3pt; overflow-wrap: anywhere; }
/* .atl-skill-label */     .atl-skill-label { font-weight: 600; font-size: calc(8.8pt * var(--s-font-scale, 1)); color: var(--c-ink); }
/* .atl-skill-val */       .atl-skill-val { font-size: calc(8.6pt * var(--s-font-scale, 1)); color: var(--c-muted); line-height: 1.4; margin-top: 1pt; }
/* .atl-edu-deg */         .atl-edu-deg { font-size: calc(8.8pt * var(--s-font-scale, 1)); font-weight: 600; color: var(--c-ink); }
/* .atl-edu-inst */        .atl-edu-inst { font-size: calc(8.6pt * var(--s-font-scale, 1)); color: var(--c-accent); margin-top: 1pt; }
/* .atl-edu-meta */        .atl-edu-meta { font-size: calc(8.4pt * var(--s-font-scale, 1)); color: var(--c-muted); margin-top: 1pt; }
```

Leave `.atl-h` where it also appears in the `.atl-main .atl-h` border override (that rule has no font-size, so it is untouched) and the unitless `1.4`/`1.05` line-heights unchanged.

- [ ] **Step 6: Run all template tests**

Run: `pnpm exec vitest run src/templates`
Expected: PASS (all).

- [ ] **Step 7: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 8: Checkpoint** — leave changes for the user to review/commit.

---

## Task 4: Add the "Size" section to the variant picker

**Files:**
- Modify: `src/forms/VariantPicker.tsx`
- Modify: `src/forms/VariantPicker.test.tsx`

**Interfaces:**
- Consumes: `SizePreset`, `DEFAULT_SIZE_ID` (Task 1).
- Produces: `VariantPickerProps.sizes: SizePreset[]`; a Size button group emitting `onChange({ ...value, sizeId })`.

- [ ] **Step 1: Update the tests** — in `src/forms/VariantPicker.test.tsx`:

Import the presets and thread them through the helper:

```tsx
import {
  COLOR_SCHEMES, FONT_PAIRINGS, SPACING_PRESETS, SIZE_PRESETS, DEFAULT_VARIANT,
} from "@/theme/variants";

function renderPicker(onChange = vi.fn()) {
  render(
    <VariantPicker
      colors={COLOR_SCHEMES}
      fonts={FONT_PAIRINGS}
      spacings={SPACING_PRESETS}
      sizes={SIZE_PRESETS}
      value={DEFAULT_VARIANT}
      onChange={onChange}
    />,
  );
  return onChange;
}
```

Add size assertions (existing color/font/spacing `it` blocks stay unchanged; `DEFAULT_VARIANT` has no `sizeId`):

```tsx
  it("renders a button per size preset with Medium active by default", () => {
    renderPicker();
    for (const name of ["Small", "Medium", "Large"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Medium" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute("aria-pressed", "false");
  });

  it("emits a new variant with only sizeId replaced", () => {
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "navy", fontId: "classic", sizeId: "large" });
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/forms/VariantPicker.test.tsx`
Expected: FAIL (`sizes` prop/type missing; Size buttons not rendered).

- [ ] **Step 3: Implement** — in `src/forms/VariantPicker.tsx`:

Extend the imports (add `SizePreset` type + `DEFAULT_SIZE_ID` value):

```tsx
import type { ColorScheme, FontPairing, SizePreset, SpacingPreset, Variant } from "@/theme/variants";
import { DEFAULT_SPACING_ID, DEFAULT_SIZE_ID } from "@/theme/variants";
```

Add `sizes` to the props interface (after `spacings`):

```tsx
  sizes: SizePreset[];
```

Add it to the destructure:

```tsx
export function VariantPicker({ colors, fonts, spacings, sizes, value, onChange }: VariantPickerProps) {
```

Append — after the Spacing `</section>` and before the outer closing `</div>` — a divider + the Size section (identical shape to Spacing):

```tsx
      <div className="h-px bg-border" />

      <section className="flex flex-col gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Size
        </span>
        <div role="group" aria-label="Font size" className="grid grid-cols-3 gap-2">
          {sizes.map((s) => {
            const active = (value.sizeId ?? DEFAULT_SIZE_ID) === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.name}
                aria-pressed={active}
                onClick={() => onChange({ ...value, sizeId: s.id })}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-foreground bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/40",
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </section>
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm exec vitest run src/forms/VariantPicker.test.tsx`
Expected: PASS (new + existing).

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: 0 errors here would require the App call site to pass `sizes`; if `astro check` flags `App.tsx` for the missing prop, that is the expected transient error fixed in Task 5. Re-run the build at the end of Task 5.

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 5: Wire the picker into App + full verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `SIZE_PRESETS` (Task 1), `VariantPicker` `sizes` prop (Task 4).

- [ ] **Step 1: Write the failing App test** — append inside `describe("App", …)` in `src/App.test.tsx`:

```tsx
  it("applies a font-size preset to the live preview from the Style popover", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const page = document.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--s-font-scale")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: /variants/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Large" }));

    expect(page.style.getPropertyValue("--s-font-scale")).toBe("1.1");
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL (no "Large" button — picker lacks `sizes` from App; popover-opening tests may also throw because `sizes.map` is undefined — all fixed in Step 3).

- [ ] **Step 3: Implement** — in `src/App.tsx`:

Add `SIZE_PRESETS` to the variants import:

```tsx
import { resolveVariantFontIds, SPACING_PRESETS, SIZE_PRESETS, type Variant } from "./theme/variants";
```

Pass it to the picker (add `sizes` to the existing `<VariantPicker>`):

```tsx
              <VariantPicker
                colors={template.variants.colors}
                fonts={template.variants.fonts}
                spacings={SPACING_PRESETS}
                sizes={SIZE_PRESETS}
                value={variant}
                onChange={setVariant}
              />
```

- [ ] **Step 4: Run the App test to confirm it passes**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS (new + all existing App tests).

- [ ] **Step 5: Run the FULL suite**

Run: `pnpm exec vitest run`
Expected: PASS (all files).

- [ ] **Step 6: Type-check + production build**

Run: `pnpm build`
Expected: `astro check` 0 errors; static build succeeds.

- [ ] **Step 7: Browser verification (source of truth for PDF).**

```bash
pnpm build && pnpm preview
```

At the preview URL:
1. Open `/build/resume/classic` → Style popover → confirm a **Size** row with `Small / Medium / Large`, `Medium` active. Click `Small` and `Large`; confirm the whole resume's type (name, headings, body, line spacing) shrinks/grows together, hierarchy preserved.
2. Set **Large**, **Download PDF**, verify with `pdffonts` / `pdftotext` / `node scripts/inspect-pdf.mjs`: still VECTOR, 0 images, variant fonts embedded, and the exported text sizes match the on-screen Large sizes.
3. Re-check **Atlas** at `/build/resume/atlas` under Small and Large: two columns intact, sidebar tint reaches content bottom, sidebar text (hardcoded sizes) scaled along with the main column. Also check **Ledger** (fully hardcoded) visibly scales at Small/Large.

If exported sizes do not match the preview, STOP and report (likely a `calc()`/`var` fallback issue) rather than shipping a mismatch.

- [ ] **Step 8: Checkpoint** — leave all changes for the user to review/commit.

---

## Self-Review (completed by plan author)

- **Spec coverage:** data model + `fontScale` (Task 1); `--s-font-scale` + scale-aware tokens (Task 2); hardcoded-literal wraps in Quill/Ledger/Atlas (Task 3); picker "Size" section (Task 4); App wiring + full/PDF/Atlas/Ledger verification (Task 5). Non-goals (per-field, body-only, slider, per-template catalogs, decorative offsets) respected.
- **Placeholder scan:** No TBD/TODO; every code step shows complete code / exact replacements.
- **Type consistency:** `sizeId` optional; `resolveVariant` return gains `fontScale` and Task 1 updates the two existing `toEqual` assertions (which already carry `sectionScale`); `themeCssVars` overrides gains `fontScale?`; `VariantPickerProps` gains required `sizes`, satisfied at the App call site in Task 5 (Task 4 Step 5 notes the transient build error). Scale values 0.9/1/1.1 identical across variants.ts, tests, and CSS expectations. Preset labels Small/Medium/Large avoid the Spacing "Default" collision.
