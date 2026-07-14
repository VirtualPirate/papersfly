# Cover Letter Document Type + Five Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "cover-letter" document kind (data + schema + AI import + routes) and five templates — cameo, strata, carbon, missive, foundry — ported 1:1 from the approved demos.

**Architecture:** Follows the repo's three decoupled layers exactly: content types in `src/data/coverLetter.ts`, a `builder<T>()` schema + importSpec + `DocumentType` module in `src/documents/cover-letter/`, and five design folders in `src/templates/cover-letter/` (invoice pattern: per-template palettes in a shared `variants.ts`). Routes, gallery cards, the editor form, and PDF verification all derive from the registry.

**Tech Stack:** Astro + React, vitest + RTL, existing jsPDF pipeline (untouched).

**Spec:** `docs/superpowers/specs/2026-07-14-cover-letter-design.md`
**Demo source of truth (markup + CSS to port):** `design-demos/cover-letters.src.html`

## Global Constraints

- **Do NOT `git commit` anywhere** — the user handles all commits themselves. Task boundaries end at "tests pass", not "commit".
- Package manager is `pnpm`. Do not touch dependency versions (toolchain is pinned to vite@8 deliberately).
- Template CSS: `font-family` values may ONLY be `var(--f-serif)` / `var(--f-sans)`; `font-weight` only 400/600/700; no `font-style: italic`; no `<img>`; geometry in `pt` (page = 612×792pt). Enforced by `src/templates/fonts.test.ts` (scans all template CSS) and `pnpm verify:pdf`.
- Every template root: `<div className="resume-page t-<name>" style={themeCssVars(resolveVariant(variant, <NAME>_VARIANTS.colors))}>`; the CSS root rule sets `width: var(--page-w); min-height: var(--page-h); box-sizing: border-box; background: #fff; color: <ink>; font-family: var(--f-sans);` and is scoped under `.resume-page.t-<name>`.
- Every keep-together block carries `data-pdf-block` (front matter, each paragraph, closing block, footers).
- Accent = `var(--c-accent)`; demo accent hexes become each template's default `ColorScheme`. Ink/gray literals stay literal.
- Wrap the 2–3 largest font sizes per template in `calc(<pt>pt * var(--s-font-scale))`; multiply the major vertical gaps by `var(--sp-section-scale)`.
- Canonical siblings to copy patterns from: `src/templates/resume/quill/` (tests, preview shape), `src/templates/invoice/nordic/` (root class + bespoke palette), `src/documents/resume/` (schema/importSpec/module tests).
- `subject` is stored WITHOUT any "Re:" prefix — each template renders its own prefix/label.

---

### Task 1: Content types + sample data

**Files:**
- Create: `src/data/coverLetter.ts`
- Test: `src/data/coverLetter.test.ts`

**Interfaces:**
- Produces: `CoverLetterData`, `CoverLetterRecipient`, `CoverLetterParagraph`, `sampleCoverLetter` (consumed by every later task). Reuses `ContactInfo` from `src/data/resume.ts`.

- [ ] **Step 1: Write the failing test** (`src/data/coverLetter.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { sampleCoverLetter } from "./coverLetter";

describe("sampleCoverLetter", () => {
  it("is a complete letter: identity, recipient, subject, 3 paragraphs", () => {
    expect(sampleCoverLetter.name).toBe("Jordan Avery Chen");
    expect(sampleCoverLetter.recipient.company).toBe("Lumenware");
    expect(sampleCoverLetter.subject).not.toMatch(/^re:/i); // templates add their own prefix
    expect(sampleCoverLetter.paragraphs).toHaveLength(3);
    const ids = sampleCoverLetter.paragraphs.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sampleCoverLetter.paragraphs.every((p) => p.text.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm exec vitest run src/data/coverLetter.test.ts` → FAIL (module not found)

- [ ] **Step 3: Implement** (`src/data/coverLetter.ts`) — content only, no design; doc comment mirroring `resume.ts`'s. Interfaces exactly as in the spec §1. `sampleCoverLetter` uses the demo letter verbatim (copy the three paragraph texts from `design-demos/cover-letters.src.html`, unescaping `&rsquo;`→’, `&mdash;`→—), ids `"para-1"`/`"para-2"`/`"para-3"`, `date: "July 14, 2026"`, `subject: "Staff Software Engineer, Platform (Req. ENG-4127)"`, `salutation: "Dear Ms. Raman,"`, `closing: "Sincerely,"`, `signature: "Jordan Avery Chen"`, recipient Priya Raman / Director of Engineering / Lumenware / 550 Congress Ave, Austin, TX 78701, contact identical to `sampleResume.contact`.

- [ ] **Step 4: Run to verify it passes** — same command → PASS

### Task 2: Derived marks helper

**Files:**
- Create: `src/documents/cover-letter/derive.ts`
- Test: `src/documents/cover-letter/derive.test.ts`

**Interfaces:**
- Produces: `monogram(name: string): string` ("Jordan Avery Chen" → "JC"; single word → first letter; blank → ""), `ghostInitial(name: string): string` ("Jordan Avery Chen" → "C"; blank → ""). Both uppercase. Consumed by cameo (Task 6) and foundry (Task 10).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { monogram, ghostInitial } from "./derive";

describe("derive", () => {
  it("monogram = first + last word initials, uppercased", () => {
    expect(monogram("Jordan Avery Chen")).toBe("JC");
    expect(monogram("cher")).toBe("C");
    expect(monogram("  ")).toBe("");
  });
  it("ghostInitial = last word initial", () => {
    expect(ghostInitial("Jordan Avery Chen")).toBe("C");
    expect(ghostInitial("")).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm exec vitest run src/documents/cover-letter/derive.test.ts` → FAIL

- [ ] **Step 3: Implement**

```ts
/** Marks derived from the sender's name — never stored, always recomputed. */
const words = (name: string): string[] => name.trim().split(/\s+/).filter(Boolean);

/** "Jordan Avery Chen" → "JC"; single word → its initial; blank → "". */
export function monogram(name: string): string {
  const w = words(name);
  if (w.length === 0) return "";
  const first = w[0][0].toUpperCase();
  return w.length === 1 ? first : first + w[w.length - 1][0].toUpperCase();
}

/** "Jordan Avery Chen" → "C" (surname initial); blank → "". */
export function ghostInitial(name: string): string {
  const w = words(name);
  return w.length === 0 ? "" : w[w.length - 1][0].toUpperCase();
}
```

- [ ] **Step 4: Run to verify it passes** → PASS

### Task 3: Form schema

**Files:**
- Create: `src/documents/cover-letter/schema.ts`
- Test: `src/documents/cover-letter/schema.test.tsx`

**Interfaces:**
- Consumes: `CoverLetterData` (Task 1), `builder` from `src/forms/schema.ts`.
- Produces: `coverLetterSchema: FormSchema<CoverLetterData>`, `makeBlankParagraph(): Omit<CoverLetterParagraph, "id">`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { coverLetterSchema, makeBlankParagraph } from "./schema";

describe("coverLetterSchema", () => {
  it("has Sender/Recipient sections and a paragraphs list", () => {
    const kinds = coverLetterSchema.map((b) => b.kind);
    expect(kinds.filter((k) => k === "section")).toHaveLength(3);
    const list = coverLetterSchema.find((b) => b.kind === "array");
    expect(list && "key" in list && list.key).toBe("paragraphs");
  });
  it("blank paragraph is a single empty text", () => {
    expect(makeBlankParagraph()).toEqual({ text: "" });
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL

- [ ] **Step 3: Implement**

```ts
import { builder, type FormSchema } from "../../forms/schema";
import type { CoverLetterData, CoverLetterParagraph } from "../../data/coverLetter";

export const makeBlankParagraph = (): Omit<CoverLetterParagraph, "id"> => ({ text: "" });

const b = builder<CoverLetterData>();

export const coverLetterSchema: FormSchema<CoverLetterData> = [
  b.section("Sender", [
    b.field("name", "Full name"),
    b.field("headline", "Headline"),
    b.group("contact", (c) => [
      c.row(c.field("email", "Email"), c.field("phone", "Phone")),
      c.row(c.field("location", "Location"), c.field("website", "Website")),
      c.field("linkedin", "LinkedIn"),
    ]),
  ]),
  b.section("Recipient", [
    b.field("date", "Date"),
    b.group("recipient", (r) => [
      r.row(r.field("name", "Name"), r.field("title", "Title")),
      r.field("company", "Company"),
      r.field("address", "Address"),
    ]),
    b.field("subject", "Subject (Re: line)", { control: "text", placeholder: "Leave blank to omit" }),
  ]),
  b.list("paragraphs", "Paragraphs", makeBlankParagraph, (p) => [
    p.textarea("text", "Paragraph", { rows: 4 }),
  ]),
  b.section("Sign-off", [
    b.row(b.field("closing", "Closing"), b.field("signature", "Signature name")),
  ]),
];
```

(Note: the schema is 3 sections + 1 list — the test's section count of 3 matches: Sender, Recipient, Sign-off.)

- [ ] **Step 4: Run to verify it passes** → PASS

### Task 4: AI import spec

**Files:**
- Create: `src/documents/cover-letter/importSpec.ts`
- Test: `src/documents/cover-letter/importSpec.test.ts`

**Interfaces:**
- Consumes: `str/obj/list` from `src/import/spec.ts` (same combinators as `documents/resume/importSpec.ts`).
- Produces: `coverLetterImportSpec: ImportSpec`.

- [ ] **Step 1: Write the failing test** — mirror the *shape* of `src/documents/resume/importSpec.test.ts` (read it first and reuse its assertion style). Minimum structural test that always applies:

```ts
import { describe, it, expect } from "vitest";
import { coverLetterImportSpec } from "./importSpec";
import { sampleCoverLetter } from "../../data/coverLetter";

describe("coverLetterImportSpec", () => {
  it("mirrors CoverLetterData minus ids", () => {
    expect(Object.keys(coverLetterImportSpec).sort()).toEqual(
      Object.keys(sampleCoverLetter).sort(),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL

- [ ] **Step 3: Implement** — exactly the spec §3 object:

```ts
import { type ImportSpec, str, obj, list } from "../../import/spec";

/** The cover-letter CONTENT contract (mirrors CoverLetterData minus `id`s). */
export const coverLetterImportSpec: ImportSpec = {
  name: str(),
  headline: str(),
  contact: obj({ email: str(), phone: str(), location: str(), website: str(), linkedin: str() }),
  date: str(),
  recipient: obj({ name: str(), title: str(), company: str(), address: str() }),
  subject: str(),
  salutation: str(),
  paragraphs: list({ text: str() }),
  closing: str(),
  signature: str(),
};
```

- [ ] **Step 4: Run to verify it passes** → PASS. Also add whichever prompt/validate round-trip assertions the resume's importSpec test performs (adapt them 1:1).

### Task 5: Template palette catalog

**Files:**
- Create: `src/templates/cover-letter/variants.ts`
- Test: `src/templates/cover-letter/variants.test.ts`

**Interfaces:**
- Produces: `CAMEO_VARIANTS`, `STRATA_VARIANTS`, `CARBON_VARIANTS`, `MISSIVE_VARIANTS`, `FOUNDRY_VARIANTS` (each `TemplateVariants`). Consumed by Tasks 6–10.

- [ ] **Step 1: Write the failing test** — copy `src/templates/invoice/variants.test.ts` verbatim, renamed to the five `*_VARIANTS` above.

- [ ] **Step 2: Run to verify it fails** → FAIL

- [ ] **Step 3: Implement** — same `c()` helper file shape as `invoice/variants.ts`:

| Export | colors (default first) | default |
|---|---|---|
| `CAMEO_VARIANTS` | `burgundy #722f37`, `navy #16324f`, `charcoal #2f2f33` | `{ colorId: "burgundy", fontId: "editorial" }` |
| `STRATA_VARIANTS` | `cobalt #1e45c0`, `ink #0f1115`, `vermilion #c2402a` | `{ colorId: "cobalt", fontId: "modern" }` |
| `CARBON_VARIANTS` | `red #c2402a`, `ink #26231e`, `blue #1e52c8` | `{ colorId: "red", fontId: "mono" }` |
| `MISSIVE_VARIANTS` | `forest #2e5d4b`, `burgundy #722f37`, `slate #334155` | `{ colorId: "forest", fontId: "classic" }` |
| `FOUNDRY_VARIANTS` | `navy #16324f`, `forest #2e5d4b`, `charcoal #2f2f33` | `{ colorId: "navy", fontId: "classic" }` |

All use `fonts: FONT_PAIRINGS`.

- [ ] **Step 4: Run to verify it passes** → PASS

### Tasks 6–10: The five templates

One task per template; identical mechanics, different design. Folder: `src/templates/cover-letter/<name>/` with `<Name>Preview.tsx`, `<name>.css`, `index.ts`, `<Name>Preview.test.tsx`, `index.test.tsx`.

**Interfaces (all five):**
- Consumes: `CoverLetterData`/`sampleCoverLetter` (Task 1), `coverLetterSchema` (Task 3), `<NAME>_VARIANTS` (Task 5), `monogram`/`ghostInitial` (Task 2, cameo/foundry only), `themeCssVars`, `resolveVariant`, `fontStyleFor`, `joinPath`, `lazyTemplate`.
- Produces: `export const <name>Template = lazyTemplate<CoverLetterData>({ id, name, description, schema: coverLetterSchema, variants: <NAME>_VARIANTS }, () => import("./<Name>Preview"))`.

**Shared TSX contract (every template):**
- Root: `resume-page t-<name>` + `themeCssVars(resolveVariant(variant, <NAME>_VARIANTS.colors))`.
- Props: `{ data: CoverLetterData; fontOverrides?: FontOverrides; variant?: Variant }` with `DEFAULT_VARIANT` fallback — copy the signature from `QuillPreview`.
- Font-override hooks: `f("name")` on sender name, `f(joinPath("recipient","name"))`, `f("salutation")`, `f(joinPath(joinPath("paragraphs", p.id), "text"))` per paragraph, `f("signature")`.
- Empty guards: `{data.subject && …}` hides the Re: row; contact items filter `v.trim()` before rendering separator-joined rows (reuse Quill's `contactParts` pattern against `ContactInfo`); recipient lines render only when non-empty; monogram/ghost render only when the helper returns non-"".
- `data-pdf-block` on: the letterhead block, the date/recipient/subject front-matter block(s), each paragraph `<p>`, the closing/signature block, and any footer.
- Body paragraphs render in data order via `data.paragraphs.map`.

**Shared CSS contract:** port the template's demo block from `design-demos/cover-letters.src.html` (`.cl-<name>` + its prefixed rules), re-scoped under `.resume-page.t-<name>`, with this exact transformation:

1. Root rule gains `width: var(--page-w); min-height: var(--page-h); box-sizing: border-box; background: #fff;` and keeps the demo's padding/ink color.
2. Every demo `font-family` → a slot var per the table below. Weights/sizes/letter-spacing stay.
3. Every demo accent hex (`#722f37`, `#1e45c0`, `#c2402a`, `#2e5d4b`, `#16324f`) → `var(--c-accent)`. Grays/inks stay literal.
4. The template's 2–3 largest font sizes → `calc(<pt>pt * var(--s-font-scale))`; the major vertical gaps (letterhead→matter, matter→body, body→close) → `calc(<pt>pt * var(--sp-section-scale))`.
5. Drop the demo-only `box-shadow` on `.sheet` (the app supplies page chrome).

**Slot routing per template (`--f-serif` = display slot):**

| Template | `var(--f-serif)` on | everything else `var(--f-sans)` |
|---|---|---|
| cameo (id `cameo`, name "Cameo", desc "Engraved stationery with a ruled monogram") | `.cam-mono`, `.cam-name`, `.cam-sig` | ✓ |
| strata (`strata`, "Strata", "Swiss routing grid under a bold rule") | `.str-name` | ✓ |
| carbon (`carbon`, "Carbon", "Typewritten routing block, stamp-red subject") | `.car-name`, `.car-sub`, `.car-row`, `.car-sig`, `.car-foot` | ✓ (body/salutation/closing word) |
| missive (`missive`, "Missive", "The salutation is the headline") | `.mis-salute`, `.mis-body`, `.mis-close` (**deliberate: the letter body is the design** — comment this in the CSS) | ✓ (return address, date, recipient, Re line) |
| foundry (`foundry`, "Foundry", "A giant ghost initial behind a quiet header") | `.fdy-ghost`, `.fdy-sig` | ✓ |

**Template-specific notes:**
- **cameo:** monogram text = `monogram(data.name)`; the typed-name line under the script signature repeats `data.signature`.
- **strata:** when `data.subject` is empty, omit the Re `.str-cell` entirely and change the grid to `grid-template-columns: 2fr 1fr` via a modifier class (e.g. `str-matter--nore`).
- **carbon:** routing rows To / At / Re / Date; At row = `recipient.company — recipient.address` (skip row if both empty); Re row only when `subject`; footer `.car-foot` keeps `position:absolute; bottom` (single-page doc) and joins the non-empty contact fields with " · ".
- **missive:** `.mis-salute::before` accent bar becomes `background: var(--c-accent)`; paragraphs use book indents (`p + p { text-indent: 18pt }`) — keep `data-pdf-block` on each `<p>` anyway.
- **foundry:** ghost = `ghostInitial(data.name)`, `color: var(--c-accent); opacity: 0.07;` root keeps `overflow: hidden`. Every flow block after the ghost keeps `position: relative` (as in the demo) so text paints above it.

**Steps for EACH of Tasks 6–10:**

- [ ] **Step 1: Write the failing tests.** `index.test.tsx`: copy `src/templates/resume/quill/index.test.tsx`, swap: `sampleCoverLetter` for `sampleResume`, the template import, id/default assertions (e.g. cameo → `{ colorId: "burgundy", fontId: "editorial" }`), and `variants.colors).toBe(<NAME>_VARIANTS.colors)`. `<Name>Preview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Preview from "./<Name>Preview";
import { sampleCoverLetter } from "../../../data/coverLetter";

describe("<Name>Preview", () => {
  it("renders the letter on a .resume-page with markers", () => {
    const { container } = render(<Preview data={sampleCoverLetter} />);
    expect(container.querySelector(".resume-page.t-<name>")).not.toBeNull();
    expect(screen.getByText("Dear Ms. Raman,")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-pdf-block]").length).toBeGreaterThanOrEqual(5);
  });
  it("hides the Re: line when subject is blank", () => {
    const { container } = render(
      <Preview data={{ ...sampleCoverLetter, subject: "" }} />,
    );
    expect(container.textContent).not.toMatch(/ENG-4127|Re:/);
  });
});
```

(cameo additionally asserts the monogram "JC" renders and disappears with a blank name; foundry the same for the ghost "C" — query via `aria-hidden` container, not text, if duplicated.)

- [ ] **Step 2: Run to verify they fail** — `pnpm exec vitest run src/templates/cover-letter/<name>` → FAIL
- [ ] **Step 3: Implement** `<Name>Preview.tsx` (translate the demo markup for `.cl-<name>` into JSX per the shared TSX contract) + `<name>.css` (per the shared CSS contract + slot table) + `index.ts` (Interfaces block above).
- [ ] **Step 4: Run to verify they pass**, then `pnpm exec vitest run src/templates/fonts.test.ts` → PASS (proves the CSS stayed inside the embeddable set).

### Task 11: Document module + registration

**Files:**
- Create: `src/documents/cover-letter/index.ts`, `src/documents/cover-letter/index.test.ts`
- Modify: `src/documents/registry.ts` (append), `src/documents/registry.test.ts` (new assertion), `src/components/create/CreateGallery.tsx:10` (`COMING_SOON_TYPES = []`)

**Interfaces:**
- Consumes: everything above.
- Produces: `coverLetterDocument: DocumentType<CoverLetterData>` with `id: "cover-letter"`, `name: "Cover letter"`, templates ordered `[cameo, strata, carbon, missive, foundry]`, and `collectCoverLetterText(data)` exported for tests.

- [ ] **Step 1: Write the failing tests.** `index.test.ts` (pattern: `resume/index.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { coverLetterDocument } from "./index";
import { sampleCoverLetter } from "../../data/coverLetter";

describe("coverLetterDocument", () => {
  it("collectText covers every user string", () => {
    const text = coverLetterDocument.collectText(sampleCoverLetter);
    for (const s of [
      "Jordan Avery Chen", "jordan.chen@example.com", "July 14, 2026",
      "Priya Raman", "Lumenware", "ENG-4127", "Dear Ms. Raman,",
      "Northwind Labs", "Sincerely,",
    ]) expect(text).toContain(s);
  });
  it("ships five templates", () => {
    expect(coverLetterDocument.templates.map((t) => t.id)).toEqual([
      "cameo", "strata", "carbon", "missive", "foundry",
    ]);
  });
});
```

Add to `registry.test.ts`: `it("registers the cover letter with five templates")` asserting `documents.find((d) => d.id === "cover-letter")?.templates.length === 5`.

- [ ] **Step 2: Run to verify they fail** → FAIL
- [ ] **Step 3: Implement.** `index.ts` mirrors `resume/index.ts`: `collectCoverLetterText` pushes `name, headline, ...Object.values(contact), date, recipient.name, recipient.title, recipient.company, recipient.address, subject, salutation, every paragraph text, closing, signature` and joins with `" "`. Register in `registry.ts` (`documents = [resumeDocument, invoiceDocument, coverLetterDocument]`). Empty the `COMING_SOON_TYPES` array (leave the const + rendering in place for future kinds).
- [ ] **Step 4: Run the full unit suite** — `pnpm test` → PASS

### Task 12: `/create-cover-letter` page

**Files:**
- Create: `src/pages/create-cover-letter.astro`

**Interfaces:**
- Consumes: `CreateGallery` (`activeDocId="cover-letter"` — pass exactly how `create-invoice.astro` passes the invoice id).

- [ ] **Step 1: Implement** — copy `src/pages/create-invoice.astro` wholesale; change: title `"Free cover letter builder — papersfly"`, description `"Write a cover letter in your browser and export a true-vector PDF with selectable text and embedded fonts. No signup, no upload — works offline."`, JSON-LD `name: "papersfly — cover letter builder"`, featureList first item `"Live cover-letter preview across five letter designs"`, breadcrumb name `"Cover letter builder"`, and the `activeDocId`.
- [ ] **Step 2: Verify** — `pnpm build` → PASS; confirm the build output contains `dist/create-cover-letter/index.html` and `dist/build/cover-letter/<all five ids>/index.html`.

### Task 13: End-to-end gates

- [ ] **Step 1:** `pnpm test` → all green.
- [ ] **Step 2:** `pnpm build` → types + all routes.
- [ ] **Step 3:** `pnpm verify:pdf` → every template × pairing exports as clean vector, no fallback fonts. **This is the decision gate for foundry's cropped ghost and carbon's absolute footer** — if foundry fails or its export looks wrong, apply the spec fallback (position the initial fully inside the margins, e.g. `top: 24pt; left: 20pt; font-size: 260pt`) and re-run; if carbon's footer misplaces, replace absolute positioning with a static block after the closing.
- [ ] **Step 4:** Visual parity: serve `pnpm preview`, screenshot each `/build/cover-letter/<id>/` preview with the browser harness (playwright-core + system Chrome, `--no-sandbox`, `domcontentloaded` + `waitForSelector(".resume-page")`) and compare against `design-demos/cover-letters.html`; assert `.resume-page` `offsetHeight ≤ 1056` for each.
