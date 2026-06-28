# Per-input Font Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `⋮` font-picker to every text input in the editor so each field can use one of a curated, embeddable font library — applied live in the preview and carried into the exported PDF.

**Architecture:** Font choices live in a `FontOverrides` map (`fieldPath → fontId`) held in `App` state, kept separate from the design-free `ResumeData`. One font library module (`library.ts`) is the single source of truth driving the picker, the preview `@font-face` rules, and the PDF embedding. The `SchemaForm` computes a stable path per control and renders the picker; the template applies each override per element; the PDF path embeds only the fonts actually in use.

**Tech Stack:** Astro + React 19, TypeScript (strict), Vitest + Testing Library (jsdom), Radix UI (unified `radix-ui` package), Tailwind v4, jsPDF `doc.html()`, `fonttools`/`pyftsubset` for font subsetting.

## Global Constraints

- **Client-side only.** No backend, no network at runtime. Fonts are embedded as base64 (`fontData.ts`); PDF generation makes zero network calls.
- **Single source of truth for fonts.** Every font's `file` name is simultaneously the jsPDF VFS key AND the `pdfFontFaces` `src.url` — they must stay equal (mismatch → failing network fetch → Helvetica fallback).
- **`ResumeData` stays design-free.** Font overrides never go into `ResumeData`; they live in a parallel `FontOverrides` map.
- **All library fonts are Latin-subset** to the exact unicode set in `src/fonts/coverage.ts`: `U+0020-007E, U+00A0-024F, U+2010-2027, U+2122, U+2192, U+2212, U+20AC, U+25CF`. The coverage warning logic is unchanged.
- **TDD throughout.** Write the failing test first; minimal code to pass; commit per task.
- **Package manager is `pnpm`.** Run a single test file with `pnpm exec vitest run <path>`.
- **The same rendered DOM is both preview and PDF source** — overrides must reach the template via props, not a second mapping.
- **Font weights:** every family ships **400 / 600 / 700** so any font renders correctly at any role the template uses (body 400, headings/labels 600, name 700).

---

## File Structure

**New files**
- `src/fonts/library.ts` — font registry: `FontId`, `FontDef`, `FONT_LIBRARY`, `getFont`, `fontStack`, `fontsByCategory`, `FONT_CATEGORIES`. Pure metadata (no base64).
- `src/fonts/library.test.ts`
- `src/fonts/overrides.ts` — `FieldPath`, `FontOverrides`, `joinPath`, `fontStyleFor`, `usedFontIds`, `setFontOverride`, `BASELINE_FONT_IDS`.
- `src/fonts/overrides.test.ts`
- `src/forms/FontPicker.tsx` — the `⋮` Radix dropdown (controlled).
- `src/forms/FontPicker.test.tsx`
- `src/fonts/<family>-<weight>.ttf` — 15 new subset TTFs (see Task 1 matrix).
- `src/fonts/Lora-LICENSE.txt`, `PlayfairDisplay-LICENSE.txt`, `IBMPlexSans-LICENSE.txt`, `IBMPlexMono-LICENSE.txt`

**Modified files**
- `scripts/gen-fonts.mjs` — emit a `FONT_DATA` record keyed by file name over all 18 weight files.
- `src/fonts/fontData.ts` — AUTO-GENERATED; now `export const FONT_DATA: Record<string,string>`.
- `src/fonts/fonts.css` — `@font-face` for all 6 families × 3 weights.
- `src/fonts/registerFonts.ts` — consume `library` + `FONT_DATA`; embed only used families; `registerFonts(doc, usedIds)` + `pdfFontFacesFor(usedIds)`.
- `src/fonts/registerFonts.test.ts` — (new test file for the rewrite)
- `src/pdf/download.ts` — `downloadResumePdf(element, filename, overrides)`.
- `src/forms/SchemaForm.tsx` — thread `path`; render `FontPicker`; new optional props + context.
- `src/forms/SchemaForm.test.tsx` — (new test file)
- `src/templates/types.ts` — `Preview` props gain `fontOverrides?`.
- `src/templates/lazyTemplate.ts` — `PreviewModule` type update.
- `src/templates/classic/ClassicPreview.tsx` — apply `fontStyleFor` per element; `contactParts` carries field keys.
- `src/templates/classic/ClassicPreview.test.tsx` — (new test file)
- `src/App.tsx` — own `fontOverrides`; wire to `SchemaForm`, `Preview`, capture copy, download, reset.
- `src/App.test.tsx` — add a font-integration test.

---

## Task 1: Font assets + base64 pipeline

Establishes every TTF and its base64 so later code can reference real bytes. This is the heaviest, most mechanical task and must come first so nothing references a missing file.

**Files:**
- Modify: `scripts/gen-fonts.mjs`
- Create: 15 new `src/fonts/*.ttf`, 4 new `*-LICENSE.txt`
- Regenerate: `src/fonts/fontData.ts`
- Test: `src/fonts/fontData.test.ts` (create)

**Weight/file matrix** (family → weight → file; ✚ = new asset, ✓ = already vendored):

| File | Family (cssFamily) | Weight |
|------|--------------------|--------|
| `inter-regular.ttf` ✓ | Inter | 400 |
| `inter-semibold.ttf` ✓ | Inter | 600 |
| `inter-bold.ttf` ✚ | Inter | 700 |
| `serif-regular.ttf` ✚ | SourceSerif | 400 |
| `serif-semibold.ttf` ✚ | SourceSerif | 600 |
| `serif-bold.ttf` ✓ | SourceSerif | 700 |
| `lora-regular.ttf` ✚ | Lora | 400 |
| `lora-semibold.ttf` ✚ | Lora | 600 |
| `lora-bold.ttf` ✚ | Lora | 700 |
| `playfair-regular.ttf` ✚ | Playfair Display | 400 |
| `playfair-semibold.ttf` ✚ | Playfair Display | 600 |
| `playfair-bold.ttf` ✚ | Playfair Display | 700 |
| `plexsans-regular.ttf` ✚ | IBM Plex Sans | 400 |
| `plexsans-semibold.ttf` ✚ | IBM Plex Sans | 600 |
| `plexsans-bold.ttf` ✚ | IBM Plex Sans | 700 |
| `plexmono-regular.ttf` ✚ | IBM Plex Mono | 400 |
| `plexmono-semibold.ttf` ✚ | IBM Plex Mono | 600 |
| `plexmono-bold.ttf` ✚ | IBM Plex Mono | 700 |

- [ ] **Step 1: Install fonttools (one-time, for subsetting)**

Run: `pip install fonttools brotli` (or `pipx install fonttools`). Verify: `pyftsubset --help | head -1`.

- [ ] **Step 2: Obtain official OFL source TTFs for each family/weight**

Get static TTFs at weights 400, 600, 700 for: Inter (need 700), Source Serif 4 (need 400 + 600), Lora (400/600/700), Playfair Display (400/600/700), IBM Plex Sans (400/600/700), IBM Plex Mono (400/600/700). Primary sources (all OFL):
- Inter — `github.com/rsms/inter` (Desktop static TTFs)
- Source Serif 4 — `github.com/adobe-fonts/source-serif`
- Lora, Playfair Display — `github.com/google/fonts` under `ofl/lora`, `ofl/playfairdisplay`
- IBM Plex Sans/Mono — `github.com/IBM/plex` releases

If a source ships only a variable font, instance it to a static weight first:
```bash
fonttools varLib.instancer "Lora[wght].ttf" wght=600 -o /tmp/lora-600.ttf
```
If a source ships OTF, convert with `fonttools ttLib` / `otf2ttf` before subsetting.

- [ ] **Step 3: Subset each source TTF to the Latin set and write to `src/fonts/`**

For every file in the matrix marked ✚, run (example for Lora 600):
```bash
pyftsubset /tmp/lora-600.ttf \
  --unicodes="U+0020-007E,U+00A0-024F,U+2010-2027,U+2122,U+2192,U+2212,U+20AC,U+25CF" \
  --layout-features="kern,liga,calt" \
  --output-file=src/fonts/lora-semibold.ttf
```
Repeat for all 15 new files (`inter-bold.ttf`, `serif-regular.ttf`, `serif-semibold.ttf`, and the lora/playfair/plexsans/plexmono regular/semibold/bold files), mapping the correct weight to `regular`=400, `semibold`=600, `bold`=700.

- [ ] **Step 4: Add OFL license files**

Copy each family's `OFL.txt` into `src/fonts/` as `Lora-LICENSE.txt`, `PlayfairDisplay-LICENSE.txt`, `IBMPlexSans-LICENSE.txt`, `IBMPlexMono-LICENSE.txt`. (Inter and Source Serif licenses already exist.)

- [ ] **Step 5: Rewrite `scripts/gen-fonts.mjs` to emit a file-keyed map**

```js
// Reads the vendored (subset) TTFs and emits a TS module holding their base64.
// jsPDF needs base64 font data; embedding it in the bundle means PDF generation
// makes ZERO network requests. Re-run with `pnpm gen:fonts` if fonts change.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, "..", "src", "fonts");

const files = [
  "inter-regular.ttf", "inter-semibold.ttf", "inter-bold.ttf",
  "serif-regular.ttf", "serif-semibold.ttf", "serif-bold.ttf",
  "lora-regular.ttf", "lora-semibold.ttf", "lora-bold.ttf",
  "playfair-regular.ttf", "playfair-semibold.ttf", "playfair-bold.ttf",
  "plexsans-regular.ttf", "plexsans-semibold.ttf", "plexsans-bold.ttf",
  "plexmono-regular.ttf", "plexmono-semibold.ttf", "plexmono-bold.ttf",
];

let out = `// AUTO-GENERATED by scripts/gen-fonts.mjs — do not edit by hand.\n`;
out += `// Base64 of the subset TTFs, keyed by file name, embedded so jsPDF font\n`;
out += `// registration needs no network.\n\n`;
out += `export const FONT_DATA: Record<string, string> = {\n`;
for (const file of files) {
  const b64 = readFileSync(join(fontsDir, file)).toString("base64");
  out += `  ${JSON.stringify(file)}: ${JSON.stringify(b64)},\n`;
}
out += `};\n`;

const dest = join(fontsDir, "fontData.ts");
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
```

- [ ] **Step 6: Write the failing test for `FONT_DATA`**

Create `src/fonts/fontData.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { FONT_DATA } from "./fontData";

const EXPECTED_FILES = [
  "inter-regular.ttf", "inter-semibold.ttf", "inter-bold.ttf",
  "serif-regular.ttf", "serif-semibold.ttf", "serif-bold.ttf",
  "lora-regular.ttf", "lora-semibold.ttf", "lora-bold.ttf",
  "playfair-regular.ttf", "playfair-semibold.ttf", "playfair-bold.ttf",
  "plexsans-regular.ttf", "plexsans-semibold.ttf", "plexsans-bold.ttf",
  "plexmono-regular.ttf", "plexmono-semibold.ttf", "plexmono-bold.ttf",
];

describe("FONT_DATA", () => {
  it("contains base64 for every expected font file", () => {
    for (const file of EXPECTED_FILES) {
      expect(FONT_DATA[file], file).toBeTypeOf("string");
      expect(FONT_DATA[file].length, file).toBeGreaterThan(1000);
    }
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm exec vitest run src/fonts/fontData.test.ts`
Expected: FAIL — `fontData.ts` still exports the old named consts (`interRegular`, …), not `FONT_DATA`.

- [ ] **Step 8: Regenerate `fontData.ts`**

Run: `pnpm gen:fonts`
Expected output: `Wrote .../src/fonts/fontData.ts (NNN KB)`.

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm exec vitest run src/fonts/fontData.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add scripts/gen-fonts.mjs src/fonts/fontData.ts src/fonts/fontData.test.ts \
  src/fonts/*.ttf src/fonts/*-LICENSE.txt
git commit -m "feat(fonts): vendor curated font library + file-keyed FONT_DATA"
```

---

## Task 2: Font library + overrides helpers

Pure TS. The single source of truth (`library.ts`) and the override math (`overrides.ts`).

**Files:**
- Create: `src/fonts/library.ts`, `src/fonts/library.test.ts`
- Create: `src/fonts/overrides.ts`, `src/fonts/overrides.test.ts`

**Interfaces:**
- Produces: `FontId` (union), `FontDef`, `FONT_LIBRARY: FontDef[]`, `getFont(id: string): FontDef | undefined`, `fontStack(id: string): string`, `fontsByCategory(cat): FontDef[]`, `FONT_CATEGORIES`. From overrides: `FieldPath = string`, `FontOverrides = Record<string, FontId>`, `joinPath(prefix, key): string`, `fontStyleFor(overrides, path): CSSProperties | undefined`, `usedFontIds(overrides): FontId[]`, `setFontOverride(overrides, path, id|null): FontOverrides`, `BASELINE_FONT_IDS: FontId[]`.

- [ ] **Step 1: Write the failing test for `library.ts`**

Create `src/fonts/library.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  FONT_LIBRARY, getFont, fontStack, fontsByCategory, FONT_CATEGORIES,
} from "./library";

describe("font library", () => {
  it("has six families with unique ids", () => {
    const ids = FONT_LIBRARY.map((f) => f.id);
    expect(ids).toEqual(["inter", "sourceSerif", "lora", "playfair", "plexSans", "plexMono"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships 400/600/700 for every family with unique file names", () => {
    const files = new Set<string>();
    for (const f of FONT_LIBRARY) {
      expect(f.weights.map((w) => w.weight).sort()).toEqual([400, 600, 700]);
      for (const w of f.weights) files.add(w.file);
    }
    expect(files.size).toBe(FONT_LIBRARY.length * 3);
  });

  it("getFont resolves by id and fontStack returns the CSS stack", () => {
    expect(getFont("lora")?.name).toBe("Lora");
    expect(getFont("nope")).toBeUndefined();
    expect(fontStack("inter")).toBe('"Inter", system-ui, sans-serif');
    expect(fontStack("nope")).toBe("inherit");
  });

  it("groups fonts by category", () => {
    expect(FONT_CATEGORIES.map((c) => c.key)).toEqual(["sans", "serif", "mono"]);
    expect(fontsByCategory("mono").map((f) => f.id)).toEqual(["plexMono"]);
    expect(fontsByCategory("sans").map((f) => f.id)).toEqual(["inter", "plexSans"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/fonts/library.test.ts`
Expected: FAIL — `Cannot find module './library'`.

- [ ] **Step 3: Implement `src/fonts/library.ts`**

```ts
/**
 * The font library: the SINGLE SOURCE OF TRUTH for every selectable font.
 *
 * This module is pure metadata (no base64). Three consumers derive from it so
 * they cannot drift: the FontPicker options, the preview @font-face rules
 * (fonts.css), and the PDF embedding (registerFonts.ts). Each weight's `file`
 * name is BOTH the jsPDF VFS key and the @font-face src.url — keep them equal.
 *
 * Every family ships 400/600/700 so any font renders correctly at any role the
 * template uses (body 400, headings/labels 600, name 700). All families are
 * subset to the Latin set in coverage.ts.
 */
export type FontId = "inter" | "sourceSerif" | "lora" | "playfair" | "plexSans" | "plexMono";
export type FontCategory = "sans" | "serif" | "mono";
export type FontWeight = 400 | 600 | 700;

export interface FontWeightFile {
  weight: FontWeight;
  /** Subset TTF file name in src/fonts/ — also the VFS key and @font-face url. */
  file: string;
}

export interface FontDef {
  id: FontId;
  /** Display name shown in the picker. */
  name: string;
  category: FontCategory;
  /** The font-family name used in CSS / @font-face. */
  cssFamily: string;
  /** Full CSS font-family stack (incl. system fallback) applied on override. */
  stack: string;
  weights: FontWeightFile[];
}

export const FONT_LIBRARY: FontDef[] = [
  {
    id: "inter", name: "Inter", category: "sans",
    cssFamily: "Inter", stack: '"Inter", system-ui, sans-serif',
    weights: [
      { weight: 400, file: "inter-regular.ttf" },
      { weight: 600, file: "inter-semibold.ttf" },
      { weight: 700, file: "inter-bold.ttf" },
    ],
  },
  {
    id: "sourceSerif", name: "Source Serif", category: "serif",
    cssFamily: "SourceSerif", stack: '"SourceSerif", Georgia, serif',
    weights: [
      { weight: 400, file: "serif-regular.ttf" },
      { weight: 600, file: "serif-semibold.ttf" },
      { weight: 700, file: "serif-bold.ttf" },
    ],
  },
  {
    id: "lora", name: "Lora", category: "serif",
    cssFamily: "Lora", stack: '"Lora", Georgia, serif',
    weights: [
      { weight: 400, file: "lora-regular.ttf" },
      { weight: 600, file: "lora-semibold.ttf" },
      { weight: 700, file: "lora-bold.ttf" },
    ],
  },
  {
    id: "playfair", name: "Playfair Display", category: "serif",
    cssFamily: "Playfair Display", stack: '"Playfair Display", Georgia, serif',
    weights: [
      { weight: 400, file: "playfair-regular.ttf" },
      { weight: 600, file: "playfair-semibold.ttf" },
      { weight: 700, file: "playfair-bold.ttf" },
    ],
  },
  {
    id: "plexSans", name: "IBM Plex Sans", category: "sans",
    cssFamily: "IBM Plex Sans", stack: '"IBM Plex Sans", system-ui, sans-serif',
    weights: [
      { weight: 400, file: "plexsans-regular.ttf" },
      { weight: 600, file: "plexsans-semibold.ttf" },
      { weight: 700, file: "plexsans-bold.ttf" },
    ],
  },
  {
    id: "plexMono", name: "IBM Plex Mono", category: "mono",
    cssFamily: "IBM Plex Mono", stack: '"IBM Plex Mono", ui-monospace, monospace',
    weights: [
      { weight: 400, file: "plexmono-regular.ttf" },
      { weight: 600, file: "plexmono-semibold.ttf" },
      { weight: 700, file: "plexmono-bold.ttf" },
    ],
  },
];

const BY_ID = new Map<string, FontDef>(FONT_LIBRARY.map((f) => [f.id, f]));

export function getFont(id: string): FontDef | undefined {
  return BY_ID.get(id);
}

export function fontStack(id: string): string {
  return getFont(id)?.stack ?? "inherit";
}

export const FONT_CATEGORIES: ReadonlyArray<{ key: FontCategory; title: string }> = [
  { key: "sans", title: "Sans" },
  { key: "serif", title: "Serif" },
  { key: "mono", title: "Mono" },
];

export function fontsByCategory(cat: FontCategory): FontDef[] {
  return FONT_LIBRARY.filter((f) => f.category === cat);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/fonts/library.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `overrides.ts`**

Create `src/fonts/overrides.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  joinPath, fontStyleFor, usedFontIds, setFontOverride, BASELINE_FONT_IDS,
} from "./overrides";

describe("joinPath", () => {
  it("returns the key at root and dotted path otherwise", () => {
    expect(joinPath("", "name")).toBe("name");
    expect(joinPath("contact", "email")).toBe("contact.email");
    expect(joinPath("experience.exp-1", "role")).toBe("experience.exp-1.role");
  });
});

describe("fontStyleFor", () => {
  it("returns undefined when no override and a fontFamily style when set", () => {
    expect(fontStyleFor({}, "name")).toBeUndefined();
    expect(fontStyleFor({ name: "lora" }, "name")).toEqual({
      fontFamily: '"Lora", Georgia, serif',
    });
  });
});

describe("usedFontIds", () => {
  it("always includes the baseline and adds known override fonts", () => {
    expect(usedFontIds({})).toEqual(BASELINE_FONT_IDS);
    expect(new Set(usedFontIds({ name: "lora", "contact.email": "plexMono" }))).toEqual(
      new Set(["inter", "sourceSerif", "lora", "plexMono"]),
    );
  });
  it("ignores unknown font ids", () => {
    expect(new Set(usedFontIds({ name: "bogus" }))).toEqual(new Set(["inter", "sourceSerif"]));
  });
});

describe("setFontOverride", () => {
  it("sets immutably and deletes on null", () => {
    const a = setFontOverride({}, "name", "lora");
    expect(a).toEqual({ name: "lora" });
    const b = setFontOverride(a, "name", null);
    expect(b).toEqual({});
    expect(a).toEqual({ name: "lora" }); // original untouched
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm exec vitest run src/fonts/overrides.test.ts`
Expected: FAIL — `Cannot find module './overrides'`.

- [ ] **Step 7: Implement `src/fonts/overrides.ts`**

```ts
/**
 * Per-field font overrides — design metadata kept SEPARATE from ResumeData.
 *
 * A FieldPath identifies one editor control (e.g. "name", "contact.email",
 * "experience.exp-1.role"). FontOverrides maps those paths to a FontId. The
 * template resolves each element's path to an inline font-family; absence means
 * "use the template default".
 */
import type { CSSProperties } from "react";
import { getFont, fontStack, type FontId } from "./library";

export type FieldPath = string;
export type FontOverrides = Record<FieldPath, FontId>;

/** Build a stable dotted path from a parent prefix and a child key. */
export function joinPath(prefix: string, key: string): FieldPath {
  return prefix ? `${prefix}.${key}` : key;
}

/** Inline style for an element, or undefined so the template's own CSS wins. */
export function fontStyleFor(
  overrides: FontOverrides,
  path: FieldPath,
): CSSProperties | undefined {
  const id = overrides[path];
  return id ? { fontFamily: fontStack(id) } : undefined;
}

/**
 * Fonts the template always uses (so they are embedded even with no overrides):
 * the Classic design's body/headings (Inter) and name (Source Serif).
 */
export const BASELINE_FONT_IDS: FontId[] = ["inter", "sourceSerif"];

/** The unique, known fonts that must be embedded for a given override set. */
export function usedFontIds(overrides: FontOverrides): FontId[] {
  const set = new Set<FontId>(BASELINE_FONT_IDS);
  for (const id of Object.values(overrides)) {
    if (getFont(id)) set.add(id);
  }
  return [...set];
}

/** Immutably set (or, on null, clear) the override for a path. */
export function setFontOverride(
  overrides: FontOverrides,
  path: FieldPath,
  id: FontId | null,
): FontOverrides {
  const next = { ...overrides };
  if (id == null) delete next[path];
  else next[path] = id;
  return next;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm exec vitest run src/fonts/overrides.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/fonts/library.ts src/fonts/library.test.ts \
  src/fonts/overrides.ts src/fonts/overrides.test.ts
git commit -m "feat(fonts): font library + per-field override helpers"
```

---

## Task 3: PDF embedding from the library (registerFonts + download)

Rewrite font registration to consume the library and embed only used families; thread overrides through the download path.

**Files:**
- Modify: `src/fonts/registerFonts.ts`
- Create: `src/fonts/registerFonts.test.ts`
- Modify: `src/pdf/download.ts`

**Interfaces:**
- Consumes: `FONT_LIBRARY`, `getFont`, `FontId` (library); `FONT_DATA` (fontData); `usedFontIds`, `FontOverrides` (overrides).
- Produces: `registerFonts(doc: jsPDF, usedIds: FontId[]): void`, `pdfFontFacesFor(usedIds: FontId[]): HTMLFontFace[]`, `downloadResumePdf(element, filename?, overrides?)`.

- [ ] **Step 1: Write the failing test for `registerFonts`**

Create `src/fonts/registerFonts.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { registerFonts, pdfFontFacesFor } from "./registerFonts";
import type { jsPDF } from "jspdf";

function fakeDoc() {
  return { addFileToVFS: vi.fn(), addFont: vi.fn() } as unknown as jsPDF;
}

describe("registerFonts", () => {
  it("embeds only the used families (all their weights)", () => {
    const doc = fakeDoc();
    registerFonts(doc, ["inter", "sourceSerif"]);
    // 2 families × 3 weights = 6 VFS additions.
    expect(doc.addFileToVFS).toHaveBeenCalledTimes(6);
    expect(doc.addFileToVFS).toHaveBeenCalledWith("inter-bold.ttf", expect.any(String));
    // Lora is not used → never embedded.
    const files = (doc.addFileToVFS as any).mock.calls.map((c: any[]) => c[0]);
    expect(files).not.toContain("lora-regular.ttf");
  });

  it("uses each file name as both VFS key and addFont path (invariant)", () => {
    const doc = fakeDoc();
    registerFonts(doc, ["inter"]);
    const vfsKeys = (doc.addFileToVFS as any).mock.calls.map((c: any[]) => c[0]);
    const fontPaths = (doc.addFont as any).mock.calls.map((c: any[]) => c[0]);
    expect(new Set(fontPaths)).toEqual(new Set(vfsKeys));
  });
});

describe("pdfFontFacesFor", () => {
  it("returns one face per used family weight, src.url === file", () => {
    const faces = pdfFontFacesFor(["lora"]);
    expect(faces).toHaveLength(3);
    expect(faces.map((f) => f.weight).sort()).toEqual([400, 600, 700]);
    for (const f of faces) {
      expect(f.family).toBe("Lora");
      expect(f.src[0].format).toBe("truetype");
      expect(f.src[0].url).toMatch(/^lora-.*\.ttf$/);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/fonts/registerFonts.test.ts`
Expected: FAIL — `registerFonts` currently takes only `doc`, and `pdfFontFacesFor` does not exist.

- [ ] **Step 3: Rewrite `src/fonts/registerFonts.ts`**

```ts
import type { jsPDF, HTMLFontFace } from "jspdf";
import { FONT_DATA } from "./fontData";
import { getFont, type FontId } from "./library";

/**
 * Load the TTF bytes for each used family into the jsPDF virtual file system and
 * register every weight. Driven entirely by the font library + FONT_DATA, so the
 * VFS key, the addFont path, and the @font-face src.url all derive from one
 * `file` field and cannot drift. Only the families in `usedIds` are embedded, so
 * a résumé using two fonts does not carry the whole library. No network: the
 * bytes are bundled base64 (fontData.ts).
 */
export function registerFonts(doc: jsPDF, usedIds: FontId[]): void {
  for (const id of usedIds) {
    const font = getFont(id);
    if (!font) continue;
    for (const w of font.weights) {
      const data = FONT_DATA[w.file];
      if (!data) continue;
      doc.addFileToVFS(w.file, data);
      doc.addFont(w.file, font.cssFamily, "normal", w.weight);
    }
  }
}

/**
 * Font-face descriptors handed to `doc.html()` — what actually wires the
 * preview's CSS font-family onto the embedded TTFs. One entry per used family
 * weight; `src.url` equals the VFS key registered above.
 */
export function pdfFontFacesFor(usedIds: FontId[]): HTMLFontFace[] {
  const faces: HTMLFontFace[] = [];
  for (const id of usedIds) {
    const font = getFont(id);
    if (!font) continue;
    for (const w of font.weights) {
      faces.push({
        family: font.cssFamily,
        style: "normal",
        weight: w.weight,
        src: [{ url: w.file, format: "truetype" }],
      });
    }
  }
  return faces;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/fonts/registerFonts.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `src/pdf/download.ts` to thread overrides**

Change the imports and the two functions (rest of the file is unchanged):
```ts
import { jsPDF } from "jspdf";
import { registerFonts, pdfFontFacesFor } from "../fonts/registerFonts";
import { usedFontIds, type FontOverrides } from "../fonts/overrides";
import { theme } from "../theme/theme";
```
```ts
async function renderResumeDoc(
  element: HTMLElement,
  overrides: FontOverrides,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

  // Embed only the fonts this résumé actually uses BEFORE rendering so
  // doc.html() can resolve the preview's inline font-family to them.
  const used = usedFontIds(overrides);
  registerFonts(doc, used);
  // ...unchanged: setProperties, document.fonts.ready, min-height neutralize...
  // In the doc.html() options, replace `fontFaces: pdfFontFaces` with:
  //   fontFaces: pdfFontFacesFor(used),
  // ...
}

export async function downloadResumePdf(
  element: HTMLElement,
  filename = "resume.pdf",
  overrides: FontOverrides = {},
): Promise<void> {
  const doc = await renderResumeDoc(element, overrides);
  doc.save(filename);
}
```
Keep the existing body of `renderResumeDoc` (title/author from `.resume-name`, `await document.fonts.ready`, the `min-height` neutralize/restore, and the `doc.html(element, {...})` call) exactly as-is except: it now takes `overrides`, computes `used`, calls `registerFonts(doc, used)`, and passes `fontFaces: pdfFontFacesFor(used)` instead of the old `pdfFontFaces` import.

- [ ] **Step 6: Run the full suite to verify nothing broke**

Run: `pnpm test`
Expected: PASS. (The existing `App.test.tsx` asserts `downloadResumePdf`'s first arg is the `.resume-page` element — still true; the new third param defaults to `{}`.)

- [ ] **Step 7: Commit**

```bash
git add src/fonts/registerFonts.ts src/fonts/registerFonts.test.ts src/pdf/download.ts
git commit -m "feat(fonts): embed only used families; thread overrides into PDF export"
```

---

## Task 4: FontPicker component

The `⋮` Radix dropdown — controlled (`value` / `onChange`), grouped options rendered in their own typeface, plus a "Default" entry.

**Files:**
- Create: `src/forms/FontPicker.tsx`, `src/forms/FontPicker.test.tsx`

**Interfaces:**
- Consumes: `FONT_CATEGORIES`, `fontsByCategory`, `getFont`, `fontStack`, `FontId` (library).
- Produces: `FontPicker(props: FontPickerProps)` where
  `FontPickerProps = { value: FontId | null; onChange: (id: FontId | null) => void; label?: string; path?: string; className?: string }`.

**Test note (read before writing tests):** Radix menus open on *pointerdown*, which is unreliable in jsdom. Open with the **keyboard** (`fireEvent.keyDown(trigger, { key: "Enter" })`) and select items with `fireEvent.keyDown(item, { key: "Enter" })` — Radix `MenuItem` synthesizes a click from Enter, so this reliably triggers `onSelect`. Do not switch these to `fireEvent.click` on the trigger.

- [ ] **Step 1: Write the failing test**

Create `src/forms/FontPicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FontPicker } from "./FontPicker";

describe("FontPicker", () => {
  it("labels the trigger as default when no value", () => {
    render(<FontPicker value={null} onChange={() => {}} label="Full name" />);
    expect(
      screen.getByRole("button", { name: /font for full name: default/i }),
    ).toBeInTheDocument();
  });

  it("reflects the active font and marks the trigger active", () => {
    render(<FontPicker value="lora" onChange={() => {}} label="Full name" />);
    const btn = screen.getByRole("button", { name: /font for full name: lora/i });
    expect(btn).toHaveAttribute("data-active", "true");
  });

  it("lists Default plus every library font when opened", () => {
    render(<FontPicker value={null} onChange={() => {}} label="Headline" />);
    fireEvent.keyDown(screen.getByRole("button", { name: /font for headline/i }), {
      key: "Enter",
    });
    expect(screen.getByRole("menuitem", { name: /default/i })).toBeInTheDocument();
    for (const name of ["Inter", "Source Serif", "Lora", "Playfair Display", "IBM Plex Sans", "IBM Plex Mono"]) {
      expect(screen.getByRole("menuitem", { name })).toBeInTheDocument();
    }
  });

  it("emits the chosen font id and null for Default", () => {
    const onChange = vi.fn();
    render(<FontPicker value="lora" onChange={onChange} label="Headline" />);
    const open = () =>
      fireEvent.keyDown(screen.getByRole("button", { name: /font for headline/i }), { key: "Enter" });

    open();
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Playfair Display" }), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("playfair");

    open();
    fireEvent.keyDown(screen.getByRole("menuitem", { name: /default/i }), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/forms/FontPicker.test.tsx`
Expected: FAIL — `Cannot find module './FontPicker'`.

- [ ] **Step 3: Implement `src/forms/FontPicker.tsx`**

```tsx
import { DropdownMenu as DM } from "radix-ui";
import { Check, EllipsisVertical } from "lucide-react";
import {
  FONT_CATEGORIES, fontsByCategory, getFont, type FontId,
} from "@/fonts/library";
import { cn } from "@/lib/utils";

export interface FontPickerProps {
  /** Current override for the field, or null for the template default. */
  value: FontId | null;
  onChange: (id: FontId | null) => void;
  /** Field label, used in the trigger's accessible name. */
  label?: string;
  /** Stable field path, exposed as data-path for testing/debugging. */
  path?: string;
  className?: string;
}

export function FontPicker({ value, onChange, label, path, className }: FontPickerProps) {
  const active = value != null;
  const current = value ? getFont(value)?.name ?? value : "default";
  const forLabel = label ? ` for ${label}` : "";

  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          type="button"
          data-path={path}
          data-active={active}
          aria-label={`Font${forLabel}: ${current}`}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded text-muted-foreground/70",
            "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "data-[active=true]:text-foreground data-[state=open]:bg-accent",
            className,
          )}
        >
          <EllipsisVertical className="size-4" />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <DM.Item
            onSelect={() => onChange(null)}
            className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
          >
            {value == null && <Check className="size-3.5" />}
            <span className={value == null ? "" : "pl-[1.375rem]"}>Default</span>
          </DM.Item>
          <DM.Separator className="-mx-1 my-1 h-px bg-border" />
          {FONT_CATEGORIES.map((cat) => {
            const fonts = fontsByCategory(cat.key);
            if (fonts.length === 0) return null;
            return (
              <DM.Group key={cat.key}>
                <DM.Label className="px-2 py-1 text-xs text-muted-foreground">
                  {cat.title}
                </DM.Label>
                {fonts.map((f) => (
                  <DM.Item
                    key={f.id}
                    onSelect={() => onChange(f.id)}
                    style={{ fontFamily: f.stack }}
                    className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                  >
                    {value === f.id && <Check className="size-3.5" />}
                    <span className={value === f.id ? "" : "pl-[1.375rem]"}>{f.name}</span>
                  </DM.Item>
                ))}
              </DM.Group>
            );
          })}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/forms/FontPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/forms/FontPicker.tsx src/forms/FontPicker.test.tsx
git commit -m "feat(forms): FontPicker dropdown (per-field font selector)"
```

---

## Task 5: Wire FontPicker into SchemaForm with stable paths

Compute a `FieldPath` per control and render a `FontPicker` docked at each input. Use a small context so the override state is not drilled through every node signature, but drill `path` (it is built incrementally).

**Files:**
- Modify: `src/forms/SchemaForm.tsx`
- Create: `src/forms/SchemaForm.test.tsx`

**Interfaces:**
- Consumes: `FontPicker` (Task 4); `joinPath`, `FontOverrides` (overrides); `FontId` (library).
- Produces: `SchemaForm` gains optional props `fontOverrides?: FontOverrides` (default `{}`) and `onFontChange?: (path: string, id: FontId | null) => void` (default noop).

- [ ] **Step 1: Write the failing test**

Create `src/forms/SchemaForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "./SchemaForm";
import { resumeSchema } from "@/documents/resume/schema";
import { sampleResume } from "@/data/resume";

function renderForm(over = {}, onFontChange = vi.fn()) {
  render(
    <SchemaForm
      schema={resumeSchema}
      data={sampleResume}
      onChange={() => {}}
      fontOverrides={over}
      onFontChange={onFontChange}
    />,
  );
  return onFontChange;
}

describe("SchemaForm font pickers", () => {
  it("renders a picker with the correct path for top-level and grouped fields", () => {
    renderForm();
    // Basics is open by default.
    expect(document.querySelector('[data-path="name"]')).toBeInTheDocument();
    expect(document.querySelector('[data-path="headline"]')).toBeInTheDocument();
    expect(document.querySelector('[data-path="contact.email"]')).toBeInTheDocument();
  });

  it("builds array-item paths from the item id (not index)", () => {
    renderForm();
    // Open the Experience accordion panel.
    fireEvent.click(screen.getByRole("button", { name: "Experience" }));
    expect(
      document.querySelector('[data-path="experience.exp-1.role"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-path="experience.exp-1.bullets"]'),
    ).toBeInTheDocument();
  });

  it("emits onFontChange(path, id) when a font is chosen", () => {
    const onFontChange = renderForm();
    const trigger = document.querySelector('[data-path="name"]') as HTMLElement;
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Lora" }), { key: "Enter" });
    expect(onFontChange).toHaveBeenCalledWith("name", "lora");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/forms/SchemaForm.test.tsx`
Expected: FAIL — `SchemaForm` does not accept `fontOverrides`/`onFontChange` and renders no `[data-path]`.

- [ ] **Step 3: Update `src/forms/SchemaForm.tsx`**

Add imports near the top:
```tsx
import { createContext, useContext, type ReactNode } from "react";
import { FontPicker } from "./FontPicker";
import { joinPath, type FontOverrides } from "@/fonts/overrides";
import type { FontId } from "@/fonts/library";
```
(Keep the existing `import type { ReactNode }` — merge it into the line above so `ReactNode` is imported once.)

Add a context just below the imports:
```tsx
interface FontFieldCtx {
  overrides: FontOverrides;
  onFontChange: (path: string, id: FontId | null) => void;
}
const FontFieldContext = createContext<FontFieldCtx>({
  overrides: {},
  onFontChange: () => {},
});
```

Replace the `Field` helper so a trailing slot (the picker) sits OUTSIDE the `<label>` (clicking it must not focus the input) but visually over the control's right edge:
```tsx
/** Label wraps its control (a real <label>) so clicking the text focuses the
   field. The font picker is a sibling (NOT inside the label) positioned over the
   control's trailing edge, so activating it never focuses the input. */
function Field({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative mb-3">
      <Label className="flex flex-col items-start gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </Label>
      {trailing}
    </div>
  );
}
```

Give `Control` an optional `className` so the input can reserve room for the `⋮`:
```tsx
function Control({
  spec,
  value,
  onChange,
  className,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  className?: string;
}) {
  if (spec.control === "textarea") {
    return (
      <Textarea
        rows={spec.rows}
        className={className}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (spec.control === "stringList") {
    const text = Array.isArray(value) ? value.join(spec.separator) : "";
    const handle = (s: string) => onChange(s.split(spec.separator));
    return spec.multiline ? (
      <Textarea rows={spec.rows} className={className} value={text} onChange={(e) => handle(e.target.value)} />
    ) : (
      <Input className={className} value={text} onChange={(e) => handle(e.target.value)} />
    );
  }
  return (
    <Input
      className={className}
      value={(value as string) ?? ""}
      placeholder={spec.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

Update `Leaf` to take a `path`, read the context, and render the picker. The `⋮` sits at the top-right for textareas and is vertically reasonable for inputs; `pr-9` keeps text clear of it:
```tsx
function Leaf({
  node,
  value,
  onChange,
  path,
}: {
  node: LeafField;
  value: Obj;
  onChange: (next: Obj) => void;
  path: string;
}) {
  const { overrides, onFontChange } = useContext(FontFieldContext);
  return (
    <Field
      label={node.label}
      trailing={
        <FontPicker
          className="absolute right-1.5 top-7"
          path={path}
          label={node.label}
          value={overrides[path] ?? null}
          onChange={(id) => onFontChange(path, id)}
        />
      }
    >
      <Control
        spec={node.spec}
        value={value[node.key]}
        onChange={(v) => onChange({ ...value, [node.key]: v })}
        className="pr-9"
      />
    </Field>
  );
}
```

Thread `path` through `Nodes` (add a `path` prop; default `""`), computing child paths with `joinPath`:
```tsx
function Nodes({
  nodes,
  value,
  onChange,
  path = "",
}: {
  nodes: FieldNode[];
  value: Obj;
  onChange: (next: Obj) => void;
  path?: string;
}) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "field") {
          return (
            <Leaf key={i} node={node} value={value} onChange={onChange} path={joinPath(path, node.key)} />
          );
        }
        if (node.kind === "row") {
          return (
            <div className="grid grid-cols-2 gap-3" key={i}>
              {node.fields.map((f, j) => (
                <Leaf key={j} node={f} value={value} onChange={onChange} path={joinPath(path, f.key)} />
              ))}
            </div>
          );
        }
        const sub = (value[node.key] ?? {}) as Obj;
        return (
          <Nodes
            key={i}
            nodes={node.children}
            value={sub}
            onChange={(next) => onChange({ ...value, [node.key]: next })}
            path={joinPath(path, node.key)}
          />
        );
      })}
    </>
  );
}
```

Thread the item path through `ArrayItems` (its `Nodes` gets `path={`${block.key}.${item.id}`}`):
```tsx
        <Nodes
          nodes={block.itemChildren}
          value={item}
          onChange={(next) => setItems(updateItem(items, item.id, next as Item))}
          path={`${block.key}.${item.id}`}
        />
```

Finally, update the exported `SchemaForm` to accept the new props and provide the context:
```tsx
export function SchemaForm<T>({
  schema,
  data,
  onChange,
  fontOverrides = {},
  onFontChange = () => {},
}: {
  schema: FormSchema<T>;
  data: T;
  onChange: (next: T) => void;
  fontOverrides?: FontOverrides;
  onFontChange?: (path: string, id: FontId | null) => void;
}) {
  const value = data as Obj;
  const setValue = onChange as unknown as (next: Obj) => void;
  const blocks = schema as Block[];
  return (
    <FontFieldContext.Provider value={{ overrides: fontOverrides, onFontChange }}>
      <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
        <Accordion type="multiple" defaultValue={["section-0"]}>
          {blocks.map((block, i) => (
            <AccordionItem key={i} value={`section-${i}`}>
              <AccordionTrigger>{block.title}</AccordionTrigger>
              <AccordionContent>
                {block.kind === "array" ? (
                  <ArrayItems block={block} data={value} onChange={setValue} />
                ) : (
                  <Nodes nodes={block.children} value={value} onChange={setValue} />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </form>
    </FontFieldContext.Provider>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/forms/SchemaForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite (guard the existing App tests)**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/forms/SchemaForm.tsx src/forms/SchemaForm.test.tsx
git commit -m "feat(forms): per-field font pickers with stable field paths in SchemaForm"
```

---

## Task 6: Apply overrides in the template (contract + ClassicPreview)

Extend the `Preview` contract to accept `fontOverrides` and make `ClassicPreview` apply each field's font by path. This is the necessary content/design boundary crossing — only the template knows which element renders which field.

**Files:**
- Modify: `src/templates/types.ts`, `src/templates/lazyTemplate.ts`
- Modify: `src/templates/classic/ClassicPreview.tsx`
- Create: `src/templates/classic/ClassicPreview.test.tsx`

**Interfaces:**
- Consumes: `fontStyleFor`, `joinPath`, `FontOverrides` (overrides).
- Produces: `Preview: ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides }>` (and `preload` returns the same component type). `ClassicPreview({ data, fontOverrides })`.

- [ ] **Step 1: Write the failing test**

Create `src/templates/classic/ClassicPreview.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ClassicPreview from "./ClassicPreview";
import { sampleResume } from "@/data/resume";

describe("ClassicPreview font overrides", () => {
  it("uses the template default font when there is no override", () => {
    render(<ClassicPreview data={sampleResume} />);
    const name = screen.getByRole("heading", { name: sampleResume.name });
    expect(name.style.fontFamily).toBe("");
  });

  it("applies a name override inline", () => {
    render(<ClassicPreview data={sampleResume} fontOverrides={{ name: "lora" }} />);
    const name = screen.getByRole("heading", { name: sampleResume.name });
    expect(name).toHaveStyle({ fontFamily: '"Lora", Georgia, serif' });
  });

  it("applies an override to an experience field by item id", () => {
    render(
      <ClassicPreview
        data={sampleResume}
        fontOverrides={{ "experience.exp-1.role": "plexMono" }}
      />,
    );
    const role = screen.getByText("Staff Software Engineer");
    expect(role).toHaveStyle({ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/templates/classic/ClassicPreview.test.tsx`
Expected: FAIL — `ClassicPreview` ignores `fontOverrides`; the role span has no inline font.

- [ ] **Step 3: Extend the `Preview` contract in `src/templates/types.ts`**

Add the import and widen the two `ComponentType` props:
```ts
import type { ComponentType } from "react";
import type { ResumeData } from "../data/resume";
import type { FontOverrides } from "../fonts/overrides";
```
Change both occurrences of `ComponentType<{ data: ResumeData }>` (the `Preview` field and the `preload` return type) to:
```ts
ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides }>
```

- [ ] **Step 4: Update `PreviewModule` in `src/templates/lazyTemplate.ts`**

```ts
import type { FontOverrides } from "../fonts/overrides";

type PreviewModule = {
  default: ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides }>;
};
```
(The `lazy(load)` / `preload` bodies are unchanged.)

- [ ] **Step 5: Rewrite `src/templates/classic/ClassicPreview.tsx` to apply overrides**

```tsx
import { Fragment } from "react";
import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./classic.css";

/** Contact entries in display order, carrying each field key, dropping empties. */
function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email],
    ["phone", c.phone],
    ["location", c.location],
    ["website", c.website],
    ["linkedin", c.linkedin],
  ];
  return ordered
    .filter(([, v]) => v.trim().length > 0)
    .map(([key, value]) => ({ key, value }));
}

export function ClassicPreview({
  data,
  fontOverrides = {},
}: {
  data: ResumeData;
  fontOverrides?: FontOverrides;
}) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page" style={themeCssVars()}>
      <header>
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && (
          <div className="resume-headline" style={f("headline")}>{data.headline}</div>
        )}
        {parts.length > 0 && (
          <div className="resume-contact">
            {parts.map((p, i) => (
              <Fragment key={p.key}>
                {i > 0 && <span className="sep">·</span>}
                <span style={f(joinPath("contact", p.key))}>{p.value}</span>
              </Fragment>
            ))}
          </div>
        )}
        <hr className="header-rule" />
      </header>

      {data.summary.trim() && (
        <section className="resume-section">
          <h2 className="section-heading">Summary</h2>
          <div className="section-body">
            <p className="resume-summary" style={f("summary")}>{data.summary}</p>
          </div>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading">Experience</h2>
          <div className="section-body">
            {data.experience.map((item) => {
              const base = joinPath("experience", item.id);
              return (
                <div className="resume-item" key={item.id}>
                  <div className="item-header">
                    <span className="item-title" style={f(joinPath(base, "role"))}>{item.role}</span>
                    <span className="item-date">
                      <span style={f(joinPath(base, "start"))}>{item.start}</span>
                      {item.start && item.end ? " – " : ""}
                      <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    </span>
                  </div>
                  <div className="item-org">
                    <span style={f(joinPath(base, "company"))}>{item.company}</span>
                    {item.location && (
                      <span className="org-location" style={f(joinPath(base, "location"))}> · {item.location}</span>
                    )}
                  </div>
                  {item.bullets.filter((b) => b.trim()).length > 0 && (
                    <ul className="bullets" style={f(joinPath(base, "bullets"))}>
                      {item.bullets
                        .filter((b) => b.trim())
                        .map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading">Education</h2>
          <div className="section-body">
            {data.education.map((item) => {
              const base = joinPath("education", item.id);
              return (
                <div className="resume-item" key={item.id}>
                  <div className="item-header">
                    <span className="item-title" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                    <span className="item-date">
                      <span style={f(joinPath(base, "start"))}>{item.start}</span>
                      {item.start && item.end ? " – " : ""}
                      <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    </span>
                  </div>
                  <div className="item-org">
                    <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                    {item.location && (
                      <span className="org-location" style={f(joinPath(base, "location"))}> · {item.location}</span>
                    )}
                  </div>
                  {item.detail.trim() && (
                    <div className="item-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading">Skills</h2>
          <div className="section-body">
            {data.skills.map((g) => {
              const base = joinPath("skills", g.id);
              return (
                <div className="skill-row" key={g.id}>
                  <span className="skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                  <span className="skill-values" style={f(joinPath(base, "items"))}>
                    {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default ClassicPreview;
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm exec vitest run src/templates/classic/ClassicPreview.test.tsx`
Expected: PASS.

- [ ] **Step 7: Type-check and run the full suite**

Run: `pnpm build` then `pnpm test`
Expected: type-check passes (the widened `Preview` contract is satisfied) and all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/templates/types.ts src/templates/lazyTemplate.ts \
  src/templates/classic/ClassicPreview.tsx src/templates/classic/ClassicPreview.test.tsx
git commit -m "feat(templates): apply per-field font overrides in ClassicPreview"
```

---

## Task 7: App integration + preview @font-face + reset

Own the override state in `App`, pass it to the editor, the live preview, the offscreen capture, and the export. Add the preview `@font-face` rules so the new families actually render on screen. Clear overrides on reset.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/fonts/fonts.css`

**Interfaces:**
- Consumes: `setFontOverride`, `FontOverrides` (overrides); `FontId` (library); `SchemaForm` props (Task 5); `Preview` props (Task 6); `downloadResumePdf(element, filename, overrides)` (Task 3).

- [ ] **Step 1: Add `@font-face` rules for the new families/weights in `src/fonts/fonts.css`**

Keep the existing three rules and append (one block per new weight):
```css
@font-face { font-family: "Inter"; font-style: normal; font-weight: 700; font-display: block; src: url("./inter-bold.ttf") format("truetype"); }

@font-face { font-family: "SourceSerif"; font-style: normal; font-weight: 400; font-display: block; src: url("./serif-regular.ttf") format("truetype"); }
@font-face { font-family: "SourceSerif"; font-style: normal; font-weight: 600; font-display: block; src: url("./serif-semibold.ttf") format("truetype"); }

@font-face { font-family: "Lora"; font-style: normal; font-weight: 400; font-display: block; src: url("./lora-regular.ttf") format("truetype"); }
@font-face { font-family: "Lora"; font-style: normal; font-weight: 600; font-display: block; src: url("./lora-semibold.ttf") format("truetype"); }
@font-face { font-family: "Lora"; font-style: normal; font-weight: 700; font-display: block; src: url("./lora-bold.ttf") format("truetype"); }

@font-face { font-family: "Playfair Display"; font-style: normal; font-weight: 400; font-display: block; src: url("./playfair-regular.ttf") format("truetype"); }
@font-face { font-family: "Playfair Display"; font-style: normal; font-weight: 600; font-display: block; src: url("./playfair-semibold.ttf") format("truetype"); }
@font-face { font-family: "Playfair Display"; font-style: normal; font-weight: 700; font-display: block; src: url("./playfair-bold.ttf") format("truetype"); }

@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 400; font-display: block; src: url("./plexsans-regular.ttf") format("truetype"); }
@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 600; font-display: block; src: url("./plexsans-semibold.ttf") format("truetype"); }
@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 700; font-display: block; src: url("./plexsans-bold.ttf") format("truetype"); }

@font-face { font-family: "IBM Plex Mono"; font-style: normal; font-weight: 400; font-display: block; src: url("./plexmono-regular.ttf") format("truetype"); }
@font-face { font-family: "IBM Plex Mono"; font-style: normal; font-weight: 600; font-display: block; src: url("./plexmono-semibold.ttf") format("truetype"); }
@font-face { font-family: "IBM Plex Mono"; font-style: normal; font-weight: 700; font-display: block; src: url("./plexmono-bold.ttf") format("truetype"); }
```

- [ ] **Step 2: Write the failing App integration test**

Add to `src/App.test.tsx` (inside the existing `describe("App", ...)`):
```tsx
  it("applies a per-field font override to the live preview", async () => {
    render(<App docId="resume" templateId="classic" />);
    const name = await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    expect(name.style.fontFamily).toBe("");

    // Open the Full name field's font picker and choose Lora.
    const picker = document.querySelector('[data-path="name"]') as HTMLElement;
    fireEvent.keyDown(picker, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Lora" }), { key: "Enter" });

    expect(name).toHaveStyle({ fontFamily: '"Lora", Georgia, serif' });
  });

  it("passes the chosen overrides to the PDF export", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    const picker = document.querySelector('[data-path="name"]') as HTMLElement;
    fireEvent.keyDown(picker, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Lora" }), { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1));
    // Third arg is the frozen overrides snapshot.
    expect(vi.mocked(downloadResumePdf).mock.calls[0][2]).toEqual({ name: "lora" });
  });
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL — no `[data-path]` pickers in `App` yet, and `downloadResumePdf` is called with only two args.

- [ ] **Step 4: Wire overrides into `src/App.tsx`**

Add imports:
```tsx
import { setFontOverride, type FontOverrides } from "./fonts/overrides";
import type { FontId } from "./fonts/library";
```

Add state next to the `data` state:
```tsx
  const [fontOverrides, setFontOverrides] = useState<FontOverrides>({});
  const handleFontChange = (path: string, id: FontId | null) =>
    setFontOverrides((prev) => setFontOverride(prev, path, id));
```

Widen the capture state to also freeze the overrides:
```tsx
  const [capture, setCapture] = useState<
    { data: any; fontOverrides: FontOverrides; Comp: ComponentType<{ data: any; fontOverrides?: FontOverrides }> } | null
  >(null);
```

In the download effect, pass the frozen overrides to the export:
```tsx
        await downloadResumePdf(host, "resume.pdf", capture.fontOverrides);
```

In `handleDownload`, freeze the overrides alongside the data + component:
```tsx
      const Comp = await template.preload();
      setCapture({ data, fontOverrides, Comp }); // freeze content + fonts + mount the offscreen copy
```

Clear overrides on reset:
```tsx
  const handleReset = () => {
    setData(doc.defaultData);
    setFontOverrides({});
  };
```

Pass the props to the editor:
```tsx
          <SchemaForm
            schema={doc.schema}
            data={data}
            onChange={setData}
            fontOverrides={fontOverrides}
            onFontChange={handleFontChange}
          />
```

Pass overrides to the live preview:
```tsx
              <Preview data={data} fontOverrides={fontOverrides} />
```

And to the offscreen capture copy:
```tsx
          <capture.Comp data={capture.data} fontOverrides={capture.fontOverrides} />
```

- [ ] **Step 5: Run the App tests to verify they pass**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS (including the four pre-existing App tests).

- [ ] **Step 6: Full suite + type-check + production build**

Run: `pnpm test` then `pnpm build`
Expected: all tests pass; `astro check` reports no type errors; build succeeds.

- [ ] **Step 7: Manual PDF verification (source of truth)**

Run: `pnpm build && pnpm preview`. In the served app: pick distinct fonts on a few fields (e.g. Playfair Display on the name, IBM Plex Mono on a skills row), Download the PDF, then:
```bash
pdffonts resume.pdf       # expect the chosen families "emb yes ... uni yes" (and Inter/SourceSerif)
pdftotext resume.pdf -    # real selectable text (proves not an image)
node scripts/inspect-pdf.mjs resume.pdf   # VECTOR verdict, zero /Image
```
Confirm a résumé with no overrides still embeds exactly Inter + Source Serif (file size unchanged from before this feature).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/fonts/fonts.css
git commit -m "feat(app): per-field font overrides wired to preview, export, and reset"
```

---

## Self-Review

**Spec coverage:**
- Per-input picker / `⋮` menu → Tasks 4 (FontPicker) + 5 (SchemaForm wiring). ✓
- Curated library, single source of truth → Tasks 1 (assets) + 2 (`library.ts`). ✓
- Overrides separate from `ResumeData` → Task 2 (`overrides.ts`), Task 7 (`App` state). ✓
- Override = font-family only; unset = template default → Task 6 (`fontStyleFor` returns undefined when unset). ✓
- Stable field paths by item id → Task 5 (`joinPath`, `ArrayItems` path), tested with `exp-1`. ✓
- Override reaches preview AND PDF → Task 6 (preview), Task 7 (capture copy + `downloadResumePdf` overrides). ✓
- Embed only used fonts → Task 2 (`usedFontIds`) + Task 3 (`registerFonts`/`pdfFontFacesFor` filter). ✓
- VFS/src.url invariant → Task 3 invariant test. ✓
- Coverage warning unchanged → no task touches `coverage.ts`; constraint documented. ✓
- Reset clears overrides → Task 7 `handleReset`. ✓
- "Default" entry clears override; active-state marker on `⋮` → Task 4 (`onChange(null)`, `data-active`). ✓
- 400/600/700 per family → Task 1 matrix + Task 2 library test. ✓
- Preview `@font-face` for new families → Task 7 Step 1. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; the only inherently-variable step (font acquisition, Task 1 Steps 1–4) gives exact tools, sources, and the deterministic subset command. ✓

**Type consistency:** `FontId`, `FontDef`, `FontOverrides`, `fontStyleFor`, `joinPath`, `usedFontIds`, `setFontOverride`, `registerFonts(doc, usedIds)`, `pdfFontFacesFor(usedIds)`, `downloadResumePdf(element, filename, overrides)`, `FontPickerProps`, and the widened `Preview` props are used identically across tasks. `cssFamily`/`stack` strings in `library.ts` match the assertions in `overrides.test.ts`, `ClassicPreview.test.tsx`, and the App test. ✓
