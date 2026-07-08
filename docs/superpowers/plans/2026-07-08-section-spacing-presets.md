# Section-Spacing Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third template-styling axis — a section-spacing preset (Compact / Default / Relaxed) — to the Style popover, adjusting the vertical gap between résumé sections across all five templates, persisting into the PDF automatically.

**Architecture:** A new `spacingId` axis on `Variant` (optional; absent ⇒ `default`). `resolveVariant()` maps it to a unitless `sectionScale`; `themeCssVars()` emits it as `--sp-section-scale`; each template multiplies its own base section gap by that token via `calc()`. The picker gets a "Spacing" section; `App` threads the global `SPACING_PRESETS`. Default preset (scale `1`) reproduces today's layout exactly.

**Tech Stack:** Astro + React (client islands), TypeScript, plain side-effect-imported CSS, Vitest + @testing-library/react, jsPDF `doc.html()`.

## Global Constraints

- **Package manager: pnpm.** Single file: `pnpm exec vitest run <path>`; full suite: `pnpm exec vitest run`; type-check + build: `pnpm build` (runs `astro check`).
- **Path alias:** `@` → `src`. Template/theme code uses relative imports; tests use `@/…` (matching the files being edited).
- **The rendered DOM is the PDF source.** No second PDF layout; a CSS var change flows to the export automatically.
- **Author sizes in `pt`.** The scale token is unitless and multiplies `pt` bases via `calc()`. Use `var(--sp-section-scale, 1)` (with the `1` fallback) in every `calc()`.
- **Default must be pixel-identical to today.** Scale `1` ⇒ `calc(base * 1)` = `base`. Do not change any base value.
- **Scope is section gaps only.** Do NOT touch item gaps, bullet gaps, `--sp-after-*`, or any `:first-child { margin-top: 0 }` reset.
- **`spacingId` is OPTIONAL on `Variant`.** Every existing `{ colorId, fontId }` literal and `DEFAULT_VARIANT` must stay valid and unchanged.
- **Commits:** The USER handles all git commits. Do NOT run `git commit`. End each task by running its tests green and pausing for review.

---

## Task 1: Add the spacing-preset axis to the variant model

**Files:**
- Modify: `src/theme/variants.ts`
- Modify: `src/theme/variants.test.ts`

**Interfaces:**
- Produces: `SpacingPreset` interface; `SPACING_PRESETS: SpacingPreset[]`; `DEFAULT_SPACING_ID: string`; `Variant.spacingId?: string`; `resolveVariant(v)` return gains `sectionScale: number`.

- [ ] **Step 1: Update the existing tests + add spacing tests** — in `src/theme/variants.test.ts`:

Update the import to pull in the new exports:

```ts
import {
  COLOR_SCHEMES, FONT_PAIRINGS, DEFAULT_VARIANT,
  SPACING_PRESETS, DEFAULT_SPACING_ID,
  resolveVariant, resolveVariantFontIds, type Variant,
} from "./variants";
```

Add `sectionScale: 1` to the two existing `resolveVariant` `toEqual` assertions. The "default" test (was lines ~25-29) becomes:

```ts
    expect(resolveVariant(DEFAULT_VARIANT)).toEqual({
      accent: "#1f3a5f",
      displayStack: '"SourceSerif", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
      sectionScale: 1,
    });
```

The non-default test (was lines ~32-38) becomes:

```ts
  it("resolves a non-default variant to its accent and font stacks", () => {
    expect(resolveVariant({ colorId: "burgundy", fontId: "editorial" })).toEqual({
      accent: "#7c2d3a",
      displayStack: '"Playfair Display", Georgia, serif',
      bodyStack: '"Inter", system-ui, sans-serif',
      sectionScale: 1,
    });
  });
```

(The "falls back to the default for unknown ids" test compares two `resolveVariant` calls, so it needs no change — both sides gain `sectionScale: 1`.)

Append a new describe block for spacing:

```ts
describe("spacing presets", () => {
  it("ships compact/default/relaxed with unique ids and a default id", () => {
    expect(SPACING_PRESETS.map((s) => s.id)).toEqual(["compact", "default", "relaxed"]);
    expect(new Set(SPACING_PRESETS.map((s) => s.id)).size).toBe(3);
    expect(DEFAULT_SPACING_ID).toBe("default");
  });

  it("resolves spacingId to a section-gap scale, defaulting to 1 when absent", () => {
    expect(resolveVariant({ colorId: "navy", fontId: "classic" }).sectionScale).toBe(1);
    expect(
      resolveVariant({ colorId: "navy", fontId: "classic", spacingId: "compact" }).sectionScale,
    ).toBe(0.5);
    expect(
      resolveVariant({ colorId: "navy", fontId: "classic", spacingId: "relaxed" }).sectionScale,
    ).toBe(1.75);
  });

  it("falls back to the default scale for an unknown spacingId", () => {
    expect(
      resolveVariant({ colorId: "navy", fontId: "classic", spacingId: "bogus" }).sectionScale,
    ).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/theme/variants.test.ts`
Expected: FAIL (`SPACING_PRESETS`/`DEFAULT_SPACING_ID` undefined; `sectionScale` missing).

- [ ] **Step 3: Implement the model** — in `src/theme/variants.ts`:

Add the interface after `FontPairing`:

```ts
export interface SpacingPreset {
  id: string;
  name: string;
  /** Unitless multiplier applied to each template's base section gap. */
  scale: number;
}
```

Add `spacingId` to `Variant`:

```ts
/** The current variant selection. */
export interface Variant {
  colorId: string;
  fontId: string;
  /** Section-spacing preset id; absent ⇒ DEFAULT_SPACING_ID (scale 1). */
  spacingId?: string;
}
```

Add the catalog after `FONT_PAIRINGS`:

```ts
export const SPACING_PRESETS: SpacingPreset[] = [
  { id: "compact", name: "Compact", scale: 0.5 },
  { id: "default", name: "Default", scale: 1 },
  { id: "relaxed", name: "Relaxed", scale: 1.75 },
];
```

Add `DEFAULT_SPACING_ID` next to `DEFAULT_VARIANT`:

```ts
export const DEFAULT_SPACING_ID = "default";
```

Add a lookup + helper next to the existing `COLOR_BY_ID`/`FONT_BY_ID` and `colorScheme`/`fontPairing`:

```ts
const SPACING_BY_ID = new Map(SPACING_PRESETS.map((s) => [s.id, s]));

function spacingPreset(id: string | undefined): SpacingPreset {
  return SPACING_BY_ID.get(id ?? DEFAULT_SPACING_ID) ?? SPACING_BY_ID.get(DEFAULT_SPACING_ID)!;
}
```

Extend `resolveVariant`'s return type and body:

```ts
export function resolveVariant(v: Variant): {
  accent: string;
  displayStack: string;
  bodyStack: string;
  sectionScale: number;
} {
  const c = colorScheme(v.colorId);
  const f = fontPairing(v.fontId);
  const s = spacingPreset(v.spacingId);
  return {
    accent: c.accent,
    displayStack: fontStack(f.display),
    bodyStack: fontStack(f.body),
    sectionScale: s.scale,
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

## Task 2: Emit `--sp-section-scale` from `themeCssVars()`

**Files:**
- Modify: `src/theme/theme.ts`
- Modify: `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: `resolveVariant`'s `sectionScale` (Task 1) — flows in via the existing `themeCssVars(resolveVariant(variant))` call sites.
- Produces: `themeCssVars()` output includes key `"--sp-section-scale"` (a stringified number, default `"1"`).

- [ ] **Step 1: Write the failing test** — append inside the existing `describe("themeCssVars", …)` in `src/theme/theme.test.ts`:

```ts
  it("emits a default section-spacing scale of 1, overridable via sectionScale", () => {
    expect(themeCssVars()["--sp-section-scale"]).toBe("1");
    expect(themeCssVars({ sectionScale: 0.5 })["--sp-section-scale"]).toBe("0.5");
    expect(themeCssVars({ sectionScale: 1.75 })["--sp-section-scale"]).toBe("1.75");
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: FAIL (`--sp-section-scale` is `undefined`).

- [ ] **Step 3: Implement** — in `src/theme/theme.ts`, extend the `themeCssVars` overrides type:

```ts
export function themeCssVars(overrides?: {
  accent?: string;
  displayStack?: string;
  bodyStack?: string;
  sectionScale?: number;
}): StyleWithVars {
```

Then add the token in the returned object, immediately after the existing `--sp-section-top` line:

```ts
    "--sp-section-top": `${t.space.sectionTop}pt`,
    "--sp-section-scale": String(overrides?.sectionScale ?? 1),
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 3: Consume the scale in all five template CSS files

Multiply each template's base section gap by `var(--sp-section-scale, 1)`. Add one end-to-end DOM assertion (Meridian) proving the chosen spacing reaches the page root.

**Files:**
- Modify: `src/templates/classic/classic.css`
- Modify: `src/templates/meridian/meridian.css`
- Modify: `src/templates/quill/quill.css`
- Modify: `src/templates/ledger/ledger.css`
- Modify: `src/templates/atlas/atlas.css`
- Modify: `src/templates/meridian/MeridianPreview.test.tsx`

**Interfaces:**
- Consumes: `--sp-section-scale` (Task 2).

- [ ] **Step 1: Write the failing DOM test** — append inside `describe("MeridianPreview", …)` in `src/templates/meridian/MeridianPreview.test.tsx`:

```tsx
  it("flows the section-spacing preset to the page root as --sp-section-scale", () => {
    const { container, rerender } = render(<MeridianPreview data={sampleResume} />);
    const page = () => container.querySelector(".resume-page") as HTMLElement;
    // Absent spacingId defaults to scale 1.
    expect(page().style.getPropertyValue("--sp-section-scale")).toBe("1");
    rerender(
      <MeridianPreview data={sampleResume} variant={{ colorId: "navy", fontId: "classic", spacingId: "relaxed" }} />,
    );
    expect(page().style.getPropertyValue("--sp-section-scale")).toBe("1.75");
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/meridian/MeridianPreview.test.tsx`
Expected: FAIL (`--sp-section-scale` empty — Task 2 emits it, so this should actually already pass IF Task 2 is done; if Task 2 is complete it will PASS immediately. In that case treat this step as a regression guard and proceed. If run in isolation before Task 2, it FAILS.)

- [ ] **Step 3: Edit `classic.css`** — change the `.resume-section` rule:

```css
.resume-section {
  margin-top: calc(var(--sp-section-top) * var(--sp-section-scale, 1));
}
```

- [ ] **Step 4: Edit `meridian.css`** — change the `.mrd-section` rule (leave the `:first-child` line untouched):

```css
.mrd-section { margin-top: calc(var(--sp-section-top) * var(--sp-section-scale, 1)); }
```

- [ ] **Step 5: Edit `quill.css`** — change the `.qll-section` rule:

```css
.qll-section { margin-top: calc(14pt * var(--sp-section-scale, 1)); }
```

- [ ] **Step 6: Edit `ledger.css`** — change the `.ldg-section` rule (leave the `:first-child` line untouched):

```css
.ldg-section { margin-top: calc(10pt * var(--sp-section-scale, 1)); }
```

- [ ] **Step 7: Edit `atlas.css`** — change the `.atl-block` rule (leave the `.atl-main .atl-block:first-child` reset untouched):

```css
.atl-block { margin-top: calc(18pt * var(--sp-section-scale, 1)); }
```

- [ ] **Step 8: Run the Meridian test + all template preview tests**

Run: `pnpm exec vitest run src/templates`
Expected: PASS (all templates; the new Meridian assertion passes).

- [ ] **Step 9: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 10: Checkpoint** — leave changes for the user to review/commit.

---

## Task 4: Add the "Spacing" section to the variant picker

**Files:**
- Modify: `src/forms/VariantPicker.tsx`
- Modify: `src/forms/VariantPicker.test.tsx`

**Interfaces:**
- Consumes: `SpacingPreset`, `DEFAULT_SPACING_ID` (Task 1).
- Produces: `VariantPickerProps.spacings: SpacingPreset[]`; a Spacing button group emitting `onChange({ ...value, spacingId })`.

- [ ] **Step 1: Update the tests** — in `src/forms/VariantPicker.test.tsx`:

Import the presets and thread them through the helper:

```tsx
import { COLOR_SCHEMES, FONT_PAIRINGS, SPACING_PRESETS, DEFAULT_VARIANT } from "@/theme/variants";

function renderPicker(onChange = vi.fn()) {
  render(
    <VariantPicker
      colors={COLOR_SCHEMES}
      fonts={FONT_PAIRINGS}
      spacings={SPACING_PRESETS}
      value={DEFAULT_VARIANT}
      onChange={onChange}
    />,
  );
  return onChange;
}
```

Add spacing assertions (the existing color/font `it` blocks stay unchanged and green — `DEFAULT_VARIANT` has no `spacingId`, so `{ ...value, colorId }` still emits `{ colorId, fontId }`):

```tsx
  it("renders a button per spacing preset with Default active by default", () => {
    renderPicker();
    for (const name of ["Compact", "Default", "Relaxed"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Relaxed" })).toHaveAttribute("aria-pressed", "false");
  });

  it("emits a new variant with only spacingId replaced", () => {
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Relaxed" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "navy", fontId: "classic", spacingId: "relaxed" });
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/forms/VariantPicker.test.tsx`
Expected: FAIL (`spacings` prop/type missing; Spacing buttons not rendered).

- [ ] **Step 3: Implement** — in `src/forms/VariantPicker.tsx`:

Extend the imports (add the `SpacingPreset` type and the `DEFAULT_SPACING_ID` value):

```tsx
import type { ColorScheme, FontPairing, SpacingPreset, Variant } from "@/theme/variants";
import { DEFAULT_SPACING_ID } from "@/theme/variants";
```

Add `spacings` to the props interface:

```tsx
export interface VariantPickerProps {
  colors: ColorScheme[];
  fonts: FontPairing[];
  spacings: SpacingPreset[];
  value: Variant;
  onChange: (next: Variant) => void;
}
```

Destructure it and render a third section. Change the signature line to include `spacings`, and append — after the Font `</section>` and before the outer closing `</div>` — a divider plus the Spacing section:

```tsx
export function VariantPicker({ colors, fonts, spacings, value, onChange }: VariantPickerProps) {
```

```tsx
      <div className="h-px bg-border" />

      <section className="flex flex-col gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Spacing
        </span>
        <div role="group" aria-label="Section spacing" className="grid grid-cols-3 gap-2">
          {spacings.map((s) => {
            const active = (value.spacingId ?? DEFAULT_SPACING_ID) === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.name}
                aria-pressed={active}
                onClick={() => onChange({ ...value, spacingId: s.id })}
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
Expected: 0 errors (this catches the now-required `spacings` prop at the `App` call site — fixed in Task 5).
NOTE: if `astro check` flags `App.tsx` for a missing `spacings` prop here, that is expected; complete Task 5 before relying on a green build. Run Step 5's build again at the end of Task 5.

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 5: Wire the picker into App + full verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `SPACING_PRESETS` (Task 1), `VariantPicker` `spacings` prop (Task 4).

- [ ] **Step 1: Write the failing App test** — append inside `describe("App", …)` in `src/App.test.tsx`:

```tsx
  it("applies a section-spacing preset to the live preview from the Style popover", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const page = document.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--sp-section-scale")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: /variants/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Relaxed" }));

    expect(page.style.getPropertyValue("--sp-section-scale")).toBe("1.75");
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL (no "Relaxed" button — picker has no `spacings` yet from App).

- [ ] **Step 3: Implement** — in `src/App.tsx`:

Add `SPACING_PRESETS` to the variants import:

```tsx
import { resolveVariantFontIds, SPACING_PRESETS, type Variant } from "./theme/variants";
```

Pass it to the picker (add the `spacings` prop to the existing `<VariantPicker>`):

```tsx
              <VariantPicker
                colors={template.variants.colors}
                fonts={template.variants.fonts}
                spacings={SPACING_PRESETS}
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

- [ ] **Step 7: Browser verification (source of truth for PDF).** Per `CLAUDE.md`, `pnpm build && pnpm preview` is the PDF source of truth.

```bash
pnpm build && pnpm preview
```

At the preview URL:
1. Open `/build/resume/classic` (or any template). Open the **Style** popover → confirm a **Spacing** row with `Compact / Default / Relaxed`; `Default` is active. Click `Compact` and `Relaxed` and confirm the gaps *between sections* tighten/loosen live while item and bullet spacing stay constant.
2. Set **Relaxed**, click **Download PDF**, and verify with `pdffonts`/`pdftotext`/`node scripts/inspect-pdf.mjs`: still VECTOR, 0 images, variant fonts embedded, and the exported section gaps match the on-screen Relaxed spacing.
3. Re-check **Atlas** at `/build/resume/atlas` under Compact and Relaxed: columns still side-by-side, sidebar tint still reaches the content bottom, single page. This is the sensitive two-column export path.

If the exported spacing does not match the preview, STOP and report (likely a `calc()`/`var` fallback issue) rather than shipping a mismatch.

- [ ] **Step 8: Checkpoint** — leave all changes for the user to review/commit.

---

## Self-Review (completed by plan author)

- **Spec coverage:** data model + `sectionScale` (Task 1); `--sp-section-scale` emission (Task 2); five-template `calc()` consumption (Task 3); picker "Spacing" section (Task 4); App wiring + full/PDF verification (Task 5). Non-goals (slider, intra-item spacing, per-template catalogs, trigger label) are respected — none introduced.
- **Placeholder scan:** No TBD/TODO; every code step shows complete code; exact rules quoted from the current CSS.
- **Type consistency:** `spacingId` optional everywhere; `resolveVariant` return gains `sectionScale` and Task 1 updates the two existing `toEqual` assertions that would otherwise break; `themeCssVars` overrides gains `sectionScale?`; `VariantPickerProps` gains required `spacings`, satisfied at the App call site in Task 5 (Task 4 Step 5 notes the transient build error). Scale values (0.5 / 1 / 1.75) identical across variants.ts, all tests, and CSS expectations.
