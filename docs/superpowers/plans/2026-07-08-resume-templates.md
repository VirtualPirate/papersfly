# Four New resume Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four structurally distinct resume templates — Meridian (modern header band), Quill (minimalist/centered), Ledger (compact/dense), Atlas (two-column sidebar) — each fully wired into the existing variants system, alongside the current Classic design.

**Architecture:** Each template is a self-contained folder under `src/templates/<id>/` exporting a `Template` via `lazyTemplate(meta, () => import("./<Name>Preview"))` (its own build chunk). Each Preview renders a `.resume-page` root styled by `themeCssVars(resolveVariant(variant))`, so colors + font pairings + PDF font embedding flow automatically. Templates are registered in `src/templates/registry.ts` and attached to `src/documents/resume/index.ts`; the `/create` gallery and `/build/[doc]/[template]` route pick them up with no route changes.

**Tech Stack:** Astro + React (client islands), TypeScript, plain side-effect-imported CSS, Vitest + @testing-library/react, jsPDF `doc.html()` for the PDF export.

## Global Constraints

- **Package manager: pnpm.** Run a single test file with `pnpm exec vitest run <path>`; the full suite with `pnpm exec vitest run`; type-check + build with `pnpm build` (runs `astro check`).
- **Path alias:** `@` → `src` (both `tsconfig.json` and `vitest.config.ts`). Template code uses relative imports (matching Classic); tests may use `@/…` (matching Classic tests).
- **The rendered DOM is the PDF source.** Author each design once as HTML/CSS; there is no second PDF layout.
- **Author sizes in `pt`.** Reuse `theme.ts` CSS vars (`--s-*`, `--sp-*`, `--margin-*`, `--c-*`, `--f-*`, `--lh-*`, `--rule-w`, `--bullet-indent`, `--skill-label-w`, `--tracking-*`) for shared rhythm; express deviations as literal `pt`. Never use `cqi`/container-query sizing (that was only for the browser mockup).
- **Contract classes (required):** the root element must carry class `resume-page`; the name element must be `<h1 class="resume-name">`. `download.ts` queries `.resume-page` and reads `.resume-name` textContent for PDF metadata.
- **Root must set `min-height: var(--page-h)`** and full base props (see CSS scoping). `download.ts` neutralizes `min-height` inline during capture.
- **All text renders through variant font slots:** `var(--f-serif)` (display/name) and `var(--f-sans)` (body/headings) plus per-field `fontStyleFor(fontOverrides, path)`. **Never hardcode a `font-family`** — the PDF embeds only `resolveVariantFontIds(variant)`; a hardcoded family falls back to Helvetica in the PDF. Accent color = `var(--c-accent)`.
- **CSS scoping (critical — the `/create` gallery renders ALL templates at once):** Each new template's CSS must use ONLY (a) the compound root selector `.resume-page.<id>` for base/root props, (b) descendant selectors under the root modifier `.<id> .resume-name`, or (c) template-unique prefixed class names (`.mrd-*`, `.qll-*`, `.ldg-*`, `.atl-*`). New templates must NOT use Classic's bare class names (`.resume-section`, `.section-heading`, `.section-body`, `.resume-summary`, `.resume-headline`, `.resume-contact`, `.header-rule`, `.resume-item`, `.item-header`, `.item-title`, `.item-date`, `.item-org`, `.org-location`, `.item-detail`, `.bullets`, `.skill-row`, `.skill-label`, `.skill-values`) because `classic.css` styles those globally. The shared contract classes `.resume-page` and `.resume-name` are overridden via the compound/scoped selectors in (a)/(b). Classic is left unchanged.
- **Single-page output only.** Each template must fit the `sampleResume` on one page.
- **Commits:** The USER handles all git commits. Do NOT run `git commit`. End each task by running its tests green and pausing for the user's review.

---

## Task 1: Extract the shared resume schema

Move `resumeSchema` (+ blank-item factories) out of the Classic template folder so no template owns another's editor schema; all resume templates import it from a document-level home.

**Files:**
- Create: `src/documents/resume/schema.ts`
- Create: `src/documents/resume/schema.test.tsx`
- Modify: `src/templates/classic/index.ts` (import path)
- Delete: `src/templates/classic/schema.ts`
- Delete: `src/templates/classic/schema.test.tsx`

**Interfaces:**
- Produces: `resumeSchema: FormSchema<ResumeData>`, `makeBlankExperience()`, `makeBlankEducation()`, `makeBlankSkill()` — now exported from `src/documents/resume/schema.ts`.

- [ ] **Step 1: Create the new schema module** — `src/documents/resume/schema.ts` with the exact content moved from `src/templates/classic/schema.ts`, fixing the relative import of `data/resume` (now two levels up):

```ts
import { builder, type FormSchema } from "../../forms/schema";
import type {
  EducationItem,
  ExperienceItem,
  ResumeData,
  SkillGroup,
} from "../../data/resume";

/** Defaults for "+ Add" — copied verbatim from the original EditorForm. */
export const makeBlankExperience = (): Omit<ExperienceItem, "id"> => ({
  role: "Job Title",
  company: "Company",
  location: "",
  start: "20XX",
  end: "Present",
  bullets: ["Describe an accomplishment with measurable impact."],
});

export const makeBlankEducation = (): Omit<EducationItem, "id"> => ({
  institution: "Institution",
  degree: "Degree",
  location: "",
  start: "20XX",
  end: "20XX",
  detail: "",
});

export const makeBlankSkill = (): Omit<SkillGroup, "id"> => ({
  label: "Category",
  items: [],
});

const b = builder<ResumeData>();

export const resumeSchema: FormSchema<ResumeData> = [
  b.section("Basics", [
    b.field("name", "Full name"),
    b.field("headline", "Headline"),
    b.group("contact", (c) => [
      c.row(c.field("email", "Email"), c.field("phone", "Phone")),
      c.row(c.field("location", "Location"), c.field("website", "Website")),
      c.field("linkedin", "LinkedIn"),
    ]),
  ]),
  b.section("Summary", [b.textarea("summary", "Professional summary", { rows: 4 })]),
  b.list("experience", "Experience", makeBlankExperience, (e) => [
    e.field("role", "Role"),
    e.row(e.field("company", "Company"), e.field("location", "Location")),
    e.row(e.field("start", "Start"), e.field("end", "End")),
    e.lines("bullets", "Bullets (one per line)", { rows: 4 }),
  ]),
  b.list("education", "Education", makeBlankEducation, (ed) => [
    ed.field("institution", "Institution"),
    ed.field("degree", "Degree"),
    ed.row(ed.field("start", "Start"), ed.field("end", "End")),
    ed.field("location", "Location"),
    ed.field("detail", "Detail"),
  ]),
  b.list("skills", "Skills", makeBlankSkill, (s) => [
    s.field("label", "Category"),
    s.tags("items", "Items (comma-separated)"),
  ]),
];
```

- [ ] **Step 2: Move the schema test** — create `src/documents/resume/schema.test.tsx` with the content from `src/templates/classic/schema.test.tsx`, fixing the two relative imports (`SchemaForm`, `data/resume`) and the schema import to `./schema`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "../../forms/SchemaForm";
import { resumeSchema, makeBlankExperience, makeBlankSkill } from "./schema";
import { sampleResume } from "../../data/resume";

/** Open every accordion section so all labels are in the DOM. */
function expandAll() {
  for (const name of ["Summary", "Experience", "Education", "Skills"]) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
}

describe("resumeSchema", () => {
  it("renders all sections and the key field labels", () => {
    render(<SchemaForm schema={resumeSchema} data={sampleResume} onChange={() => {}} />);
    for (const heading of ["Basics", "Summary", "Experience", "Education", "Skills"]) {
      expect(screen.getByRole("button", { name: heading })).toBeInTheDocument();
    }
    expandAll();
    for (const label of [
      "Full name", "Headline", "Email", "Phone", "Website", "LinkedIn",
      "Professional summary", "Role", "Company", "Bullets (one per line)",
      "Institution", "Degree", "Detail", "Category", "Items (comma-separated)",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("renders one card (Remove button) per experience, education and skill entry", () => {
    render(<SchemaForm schema={resumeSchema} data={sampleResume} onChange={() => {}} />);
    expandAll();
    const expected =
      sampleResume.experience.length + sampleResume.education.length + sampleResume.skills.length;
    expect(screen.getAllByRole("button", { name: /^Remove / }).length).toBe(expected);
  });

  it("blank-item factories match the original add-button defaults", () => {
    expect(makeBlankExperience()).toEqual({
      role: "Job Title", company: "Company", location: "",
      start: "20XX", end: "Present",
      bullets: ["Describe an accomplishment with measurable impact."],
    });
    expect(makeBlankSkill()).toEqual({ label: "Category", items: [] });
  });
});
```

- [ ] **Step 3: Point Classic at the new schema** — edit `src/templates/classic/index.ts` line 2:

```ts
// from:
import { resumeSchema } from "./schema";
// to:
import { resumeSchema } from "../../documents/resume/schema";
```

- [ ] **Step 4: Delete the old files**

```bash
rm src/templates/classic/schema.ts src/templates/classic/schema.test.tsx
```

- [ ] **Step 5: Verify nothing else imported the old path**

Run: `grep -rn "classic/schema" src`
Expected: no output (empty).

- [ ] **Step 6: Run the moved test + Classic's tests**

Run: `pnpm exec vitest run src/documents/resume/schema.test.tsx src/templates/classic`
Expected: PASS (all).

- [ ] **Step 7: Type-check**

Run: `pnpm build`
Expected: `astro check` reports 0 errors; build succeeds.

- [ ] **Step 8: Checkpoint** — leave changes for the user to review/commit (do not run `git commit`).

---

## Task 2: Add the `--c-accent-soft` theme token

Atlas's tinted sidebar needs an accent-derived tint that adapts to the chosen color scheme. Emit `--c-accent-soft` from `themeCssVars()` as a plain hex (html2canvas-safe).

**Files:**
- Modify: `src/theme/theme.ts`
- Modify: `src/theme/theme.test.ts`

**Interfaces:**
- Produces: `themeCssVars()` output now includes key `"--c-accent-soft"` (a light hex tint of the resolved accent).

- [ ] **Step 1: Write the failing test** — append to `src/theme/theme.test.ts` (inside the existing `describe("themeCssVars", …)`):

```ts
  it("derives a light --c-accent-soft tint from the accent", () => {
    expect(themeCssVars()["--c-accent-soft"]).toBe("#edeff2");
    expect(themeCssVars({ accent: "#7c2d3a" })["--c-accent-soft"]).toBe("#f5eeef");
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: FAIL (`--c-accent-soft` is `undefined`).

- [ ] **Step 3: Implement the token** — in `src/theme/theme.ts`, add a helper above `themeCssVars` (after the `StyleWithVars` type):

```ts
/**
 * Mix a #rrggbb hex toward white by `amount` (0..1); 0 = unchanged, 1 = white.
 * Used to derive --c-accent-soft (a light tint of the accent) for surfaces like
 * Atlas's sidebar. Returns a plain hex so the PDF's html2canvas layer can parse
 * it (unlike CSS color-mix()).
 */
function tintTowardWhite(hex: string, amount: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const chan = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount);
  };
  const to2 = (c: number) => c.toString(16).padStart(2, "0");
  return `#${to2(chan(16))}${to2(chan(8))}${to2(chan(0))}`;
}
```

Then, inside `themeCssVars`, replace the `--c-accent` line with an accent local + the new token. Change:

```ts
    "--c-accent": overrides?.accent ?? t.color.accent,
```

to:

```ts
    "--c-accent": accent,
    "--c-accent-soft": tintTowardWhite(accent, 0.92),
```

and add, at the top of the function body (right after `const t = theme;`):

```ts
  const accent = overrides?.accent ?? t.color.accent;
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/theme/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 3: Preview gallery thumbnails in each template's default variant

`TemplateCard` renders the thumbnail with no `variant`, so every card shows the global default (navy/classic). Pass `template.variants.default` so each card previews in its intended look.

**Files:**
- Modify: `src/components/create/TemplateCard.tsx:26`
- Create: `src/components/create/TemplateCard.test.tsx`

**Interfaces:**
- Consumes: `Template.variants.default` (already on every template).

- [ ] **Step 1: Write the failing test** — `src/components/create/TemplateCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { Variant } from "@/theme/variants";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "@/theme/variants";
import { TemplateCard } from "./TemplateCard";

describe("TemplateCard", () => {
  it("renders the thumbnail in the template's default variant", () => {
    const seen: (Variant | undefined)[] = [];
    const dflt: Variant = { colorId: "forest", fontId: "editorial" };
    const fake = {
      id: "fake",
      name: "Fake",
      description: "desc",
      schema: [],
      variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: dflt },
      Preview: (p: { variant?: Variant }) => {
        seen.push(p.variant);
        return <div className="resume-page" data-color={p.variant?.colorId} />;
      },
      preload: async () => fake.Preview,
    };
    render(<TemplateCard docId="resume" template={fake as never} data={{}} />);
    expect(seen[0]).toEqual(dflt);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/components/create/TemplateCard.test.tsx`
Expected: FAIL (`seen[0]` is `undefined`).

- [ ] **Step 3: Implement** — in `src/components/create/TemplateCard.tsx`, change the preview render (line 26):

```tsx
// from:
            <Preview data={data as never} />
// to:
            <Preview data={data as never} variant={template.variants.default} />
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/components/create/TemplateCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 6: Checkpoint** — leave changes for the user to review/commit.

---

## Task 4: Meridian template (modern header band)

**Files:**
- Create: `src/templates/meridian/MeridianPreview.tsx`
- Create: `src/templates/meridian/meridian.css`
- Create: `src/templates/meridian/index.ts`
- Create: `src/templates/meridian/MeridianPreview.test.tsx`
- Create: `src/templates/meridian/index.test.tsx`
- Modify: `src/templates/registry.ts`
- Modify: `src/documents/resume/index.ts`

**Interfaces:**
- Consumes: `resumeSchema` (Task 1), `--c-accent-soft` not needed here, `themeCssVars`/`resolveVariant`/`DEFAULT_VARIANT`/`Variant`, `fontStyleFor`/`joinPath`/`FontOverrides`.
- Produces: `meridianTemplate: Template` (id `"meridian"`, default variant `{ colorId: "navy", fontId: "classic" }`).

- [ ] **Step 1: Write the failing Preview test** — `src/templates/meridian/MeridianPreview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MeridianPreview from "./MeridianPreview";
import { sampleResume } from "@/data/resume";

describe("MeridianPreview", () => {
  it("renders the page root and the name", () => {
    const { container } = render(<MeridianPreview data={sampleResume} />);
    expect(container.querySelector(".resume-page.meridian")).not.toBeNull();
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("applies the selected variant to the page root", () => {
    const { container } = render(
      <MeridianPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("defaults to navy + Source Serif when no variant is passed", () => {
    const { container } = render(<MeridianPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("applies a per-field font override inline, winning over the pairing", () => {
    render(
      <MeridianPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora", "experience.exp-1.role": "plexMono" }}
      />,
    );
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toHaveStyle({
      fontFamily: '"Lora", Georgia, serif',
    });
    expect(screen.getByText("Staff Software Engineer")).toHaveStyle({
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/meridian/MeridianPreview.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Preview** — `src/templates/meridian/MeridianPreview.tsx`:

```tsx
import { Fragment } from "react";
import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./meridian.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function MeridianPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page meridian" style={themeCssVars(resolveVariant(variant))}>
      <div className="mrd-band">
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && <div className="mrd-headline" style={f("headline")}>{data.headline}</div>}
        {parts.length > 0 && (
          <div className="mrd-contact">
            {parts.map((p, i) => (
              <Fragment key={p.key}>
                {i > 0 && <span className="mrd-sep">·</span>}
                <span style={f(joinPath("contact", p.key))}>{p.value}</span>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="mrd-body">
        {data.summary.trim() && (
          <section className="mrd-section">
            <h2 className="mrd-sec-h">Summary</h2>
            <div className="mrd-sec-body">
              <p className="mrd-summary" style={f("summary")}>{data.summary}</p>
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section className="mrd-section">
            <h2 className="mrd-sec-h">Experience</h2>
            <div className="mrd-sec-body">
              {data.experience.map((item) => {
                const base = joinPath("experience", item.id);
                return (
                  <div className="mrd-item" key={item.id}>
                    <div className="mrd-item-header">
                      <span className="mrd-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                      <span className="mrd-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? " – " : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    <div className="mrd-org">
                      <span style={f(joinPath(base, "company"))}>{item.company}</span>
                      {item.location && (
                        <span className="mrd-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.bullets.filter((b) => b.trim()).length > 0 && (
                      <ul className="mrd-bullets" style={f(joinPath(base, "bullets"))}>
                        {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.education.length > 0 && (
          <section className="mrd-section">
            <h2 className="mrd-sec-h">Education</h2>
            <div className="mrd-sec-body">
              {data.education.map((item) => {
                const base = joinPath("education", item.id);
                return (
                  <div className="mrd-item" key={item.id}>
                    <div className="mrd-item-header">
                      <span className="mrd-role" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                      <span className="mrd-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? " – " : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    <div className="mrd-org">
                      <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                      {item.location && (
                        <span className="mrd-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.detail.trim() && (
                      <div className="mrd-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="mrd-section">
            <h2 className="mrd-sec-h">Skills</h2>
            <div className="mrd-sec-body">
              {data.skills.map((g) => {
                const base = joinPath("skills", g.id);
                return (
                  <div className="mrd-skill-row" key={g.id}>
                    <span className="mrd-skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                    <span className="mrd-skill-val" style={f(joinPath(base, "items"))}>
                      {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default MeridianPreview;
```

- [ ] **Step 4: Create the CSS** — `src/templates/meridian/meridian.css`:

```css
/* Meridian — full-bleed accent header band over a single-column body. */
.resume-page.meridian {
  width: var(--page-w);
  min-height: var(--page-h);
  box-sizing: border-box;
  padding: 0;
  background: #ffffff;
  color: var(--c-ink);
  font-family: var(--f-sans);
  font-size: var(--s-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.mrd-band { background: var(--c-accent); padding: 30pt var(--margin-x) 22pt; }
.meridian .resume-name {
  margin: 0; font-family: var(--f-serif); font-weight: 700;
  font-size: var(--s-name); line-height: 1.02; letter-spacing: -0.2pt; color: #ffffff;
}
.mrd-headline {
  margin: 6pt 0 0; font-weight: 600; font-size: var(--s-headline);
  letter-spacing: var(--tracking-headline); text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
}
.mrd-contact { margin: 9pt 0 0; font-size: var(--s-contact); line-height: var(--lh-contact); color: rgba(255, 255, 255, 0.9); }
.mrd-sep { color: rgba(255, 255, 255, 0.5); padding: 0 5pt; }
.mrd-body { padding: 20pt var(--margin-x) var(--margin-bottom); }
.mrd-section { margin-top: var(--sp-section-top); }
.mrd-section:first-child { margin-top: 0; }
.mrd-sec-h {
  margin: 0; font-weight: 600; font-size: var(--s-section);
  letter-spacing: var(--tracking-section); text-transform: uppercase; color: var(--c-accent);
  padding-bottom: 4pt; border-bottom: var(--rule-w) solid var(--c-rule);
}
.mrd-sec-body { margin-top: var(--sp-after-section-heading); }
.mrd-summary { margin: 0; color: var(--c-ink); }
.mrd-item + .mrd-item { margin-top: var(--sp-item-gap); }
.mrd-item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.mrd-role { font-weight: 600; font-size: var(--s-role); color: var(--c-ink); }
.mrd-date { flex: none; font-size: var(--s-date); color: var(--c-faint); white-space: nowrap; }
.mrd-org { margin-top: var(--sp-after-item-header); font-size: var(--s-org); color: var(--c-accent); }
.mrd-org .mrd-loc { color: var(--c-muted); }
.mrd-detail { margin-top: var(--sp-after-item-header); font-size: var(--s-body); color: var(--c-muted); }
.mrd-bullets { margin: var(--sp-after-org) 0 0; padding: 0; list-style: none; }
.mrd-bullets li { position: relative; padding-left: var(--bullet-indent); color: var(--c-ink); }
.mrd-bullets li + li { margin-top: var(--sp-bullet-gap); }
.mrd-bullets li::before {
  content: ""; position: absolute; left: 2pt; top: calc(var(--lh-body) / 2 - 1pt);
  width: 2.4pt; height: 2.4pt; border-radius: 50%; background: var(--c-accent);
}
.mrd-skill-row { display: flex; gap: var(--sp-skill-gap); }
.mrd-skill-row + .mrd-skill-row { margin-top: var(--sp-skill-row-gap); }
.mrd-skill-label { flex: none; width: var(--skill-label-w); font-weight: 600; color: var(--c-ink); }
.mrd-skill-val { color: var(--c-muted); }
```

- [ ] **Step 5: Run the Preview test to confirm it passes**

Run: `pnpm exec vitest run src/templates/meridian/MeridianPreview.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing index test** — `src/templates/meridian/index.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { meridianTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("meridian template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await meridianTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <meridianTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full color + font catalog and a navy/classic default", () => {
    expect(meridianTemplate.id).toBe("meridian");
    expect(meridianTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(meridianTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(meridianTemplate.variants.default).toEqual({ colorId: "navy", fontId: "classic" });
  });
});
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/meridian/index.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 8: Create the index** — `src/templates/meridian/index.ts`:

```ts
import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

export const meridianTemplate = lazyTemplate(
  {
    id: "meridian",
    name: "Meridian",
    description: "Modern accent header band",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "navy", fontId: "classic" } },
  },
  () => import("./MeridianPreview"),
);
```

- [ ] **Step 9: Register the template** — edit `src/templates/registry.ts`:

```ts
import type { Template } from "./types";
import { classicTemplate } from "./classic";
import { meridianTemplate } from "./meridian";

export const templates: Template[] = [classicTemplate, meridianTemplate];

export const defaultTemplate = templates[0];
```

And edit `src/documents/resume/index.ts`:

```ts
import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/classic";
import { meridianTemplate } from "../../templates/meridian";

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "resume",
  defaultData: sampleResume,
  templates: [classicTemplate, meridianTemplate],
};
```

- [ ] **Step 10: Run Meridian's tests + the registry/document tests**

Run: `pnpm exec vitest run src/templates/meridian src/documents/registry.test.ts`
Expected: PASS.

- [ ] **Step 11: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 12: Checkpoint** — leave changes for the user to review/commit.

---

## Task 5: Quill template (minimalist / centered)

**Files:**
- Create: `src/templates/quill/QuillPreview.tsx`
- Create: `src/templates/quill/quill.css`
- Create: `src/templates/quill/index.ts`
- Create: `src/templates/quill/QuillPreview.test.tsx`
- Create: `src/templates/quill/index.test.tsx`
- Modify: `src/templates/registry.ts`
- Modify: `src/documents/resume/index.ts`

**Interfaces:**
- Produces: `quillTemplate: Template` (id `"quill"`, default variant `{ colorId: "charcoal", fontId: "editorial" }`).

- [ ] **Step 1: Write the failing Preview test** — `src/templates/quill/QuillPreview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuillPreview from "./QuillPreview";
import { sampleResume } from "@/data/resume";

describe("QuillPreview", () => {
  it("renders the page root and the name", () => {
    const { container } = render(<QuillPreview data={sampleResume} />);
    expect(container.querySelector(".resume-page.quill")).not.toBeNull();
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("applies the selected variant to the page root", () => {
    const { container } = render(
      <QuillPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("defaults to navy + Source Serif when no variant is passed", () => {
    const { container } = render(<QuillPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("applies a per-field font override inline, winning over the pairing", () => {
    render(
      <QuillPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora", "experience.exp-1.role": "plexMono" }}
      />,
    );
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toHaveStyle({
      fontFamily: '"Lora", Georgia, serif',
    });
    expect(screen.getByText("Staff Software Engineer")).toHaveStyle({
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/quill/QuillPreview.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Preview** — `src/templates/quill/QuillPreview.tsx`:

```tsx
import { Fragment } from "react";
import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./quill.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function QuillPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page quill" style={themeCssVars(resolveVariant(variant))}>
      <header className="qll-head">
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && <div className="qll-headline" style={f("headline")}>{data.headline}</div>}
        {parts.length > 0 && (
          <div className="qll-contact">
            {parts.map((p, i) => (
              <Fragment key={p.key}>
                {i > 0 && <span className="qll-sep">·</span>}
                <span style={f(joinPath("contact", p.key))}>{p.value}</span>
              </Fragment>
            ))}
          </div>
        )}
      </header>
      <div className="qll-rule" />

      <div className="qll-body">
        {data.summary.trim() && (
          <section className="qll-section">
            <h2 className="qll-sec-h">Summary</h2>
            <div className="qll-sec-body">
              <p className="qll-summary" style={f("summary")}>{data.summary}</p>
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section className="qll-section">
            <h2 className="qll-sec-h">Experience</h2>
            <div className="qll-sec-body">
              {data.experience.map((item) => {
                const base = joinPath("experience", item.id);
                return (
                  <div className="qll-item" key={item.id}>
                    <div className="qll-item-header">
                      <span className="qll-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                      <span className="qll-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? " – " : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    <div className="qll-org">
                      <span className="qll-co" style={f(joinPath(base, "company"))}>{item.company}</span>
                      {item.location && (
                        <span className="qll-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.bullets.filter((b) => b.trim()).length > 0 && (
                      <ul className="qll-bullets" style={f(joinPath(base, "bullets"))}>
                        {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.education.length > 0 && (
          <section className="qll-section">
            <h2 className="qll-sec-h">Education</h2>
            <div className="qll-sec-body">
              {data.education.map((item) => {
                const base = joinPath("education", item.id);
                return (
                  <div className="qll-item" key={item.id}>
                    <div className="qll-item-header">
                      <span className="qll-role" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                      <span className="qll-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? " – " : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    <div className="qll-org">
                      <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                      {item.location && (
                        <span className="qll-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.detail.trim() && (
                      <div className="qll-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="qll-section">
            <h2 className="qll-sec-h">Skills</h2>
            <div className="qll-sec-body">
              {data.skills.map((g) => {
                const base = joinPath("skills", g.id);
                return (
                  <div className="qll-skill-row" key={g.id}>
                    <span className="qll-skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                    <span className="qll-skill-val" style={f(joinPath(base, "items"))}>
                      {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default QuillPreview;
```

- [ ] **Step 4: Create the CSS** — `src/templates/quill/quill.css`:

```css
/* Quill — centered header, hairline rules, restrained color. */
.resume-page.quill {
  width: var(--page-w);
  min-height: var(--page-h);
  box-sizing: border-box;
  padding: var(--margin-top) var(--margin-x) var(--margin-bottom);
  background: #ffffff;
  color: var(--c-ink);
  font-family: var(--f-sans);
  font-size: var(--s-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.qll-head { text-align: center; }
.quill .resume-name {
  margin: 0; font-family: var(--f-serif); font-weight: 700;
  font-size: 26pt; line-height: 1.05; letter-spacing: 0.2pt; color: var(--c-ink);
}
.qll-headline {
  margin: 6pt 0 0; text-transform: uppercase; letter-spacing: 1.2pt;
  font-size: var(--s-headline); font-weight: 600; color: var(--c-muted);
}
.qll-contact { margin: 9pt 0 0; font-size: var(--s-contact); line-height: var(--lh-contact); color: var(--c-muted); }
.qll-sep { color: var(--c-faint); padding: 0 5pt; }
.qll-rule { margin: 12pt 0 0; height: var(--rule-w); background: var(--c-rule); }
.qll-body { margin-top: 2pt; }
.qll-section { margin-top: 14pt; }
.qll-sec-h {
  display: flex; align-items: center; gap: 10pt; margin: 0;
  text-transform: uppercase; letter-spacing: 1.2pt; font-size: var(--s-section);
  font-weight: 600; color: var(--c-accent);
}
.qll-sec-h::after { content: ""; flex: 1; height: var(--rule-w); background: var(--c-rule); }
.qll-sec-body { margin-top: var(--sp-after-section-heading); }
.qll-summary { margin: 0; color: var(--c-ink); }
.qll-item + .qll-item { margin-top: 9pt; }
.qll-item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.qll-role { font-weight: 600; font-size: var(--s-role); color: var(--c-ink); }
.qll-date { flex: none; font-size: var(--s-date); color: var(--c-faint); white-space: nowrap; }
.qll-org { margin-top: var(--sp-after-item-header); font-size: var(--s-org); color: var(--c-muted); }
.qll-co { color: var(--c-ink); font-weight: 600; }
.qll-loc { color: var(--c-muted); }
.qll-detail { margin-top: var(--sp-after-item-header); font-size: var(--s-body); color: var(--c-muted); }
.qll-bullets { margin: var(--sp-after-org) 0 0; padding: 0; list-style: none; }
.qll-bullets li { position: relative; padding-left: var(--bullet-indent); color: var(--c-ink); }
.qll-bullets li + li { margin-top: var(--sp-bullet-gap); }
.qll-bullets li::before {
  content: ""; position: absolute; left: 2pt; top: calc(var(--lh-body) / 2 - 1pt);
  width: 2.4pt; height: 2.4pt; border-radius: 50%; background: var(--c-faint);
}
.qll-skill-row { display: flex; gap: var(--sp-skill-gap); }
.qll-skill-row + .qll-skill-row { margin-top: var(--sp-skill-row-gap); }
.qll-skill-label { flex: none; width: var(--skill-label-w); font-weight: 600; color: var(--c-ink); }
.qll-skill-val { color: var(--c-muted); }
```

- [ ] **Step 5: Run the Preview test to confirm it passes**

Run: `pnpm exec vitest run src/templates/quill/QuillPreview.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing index test** — `src/templates/quill/index.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { quillTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("quill template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await quillTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <quillTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full catalog and a charcoal/editorial default", () => {
    expect(quillTemplate.id).toBe("quill");
    expect(quillTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(quillTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(quillTemplate.variants.default).toEqual({ colorId: "charcoal", fontId: "editorial" });
  });
});
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/quill/index.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 8: Create the index** — `src/templates/quill/index.ts`:

```ts
import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

export const quillTemplate = lazyTemplate(
  {
    id: "quill",
    name: "Quill",
    description: "Minimalist, centered, editorial",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "charcoal", fontId: "editorial" } },
  },
  () => import("./QuillPreview"),
);
```

- [ ] **Step 9: Register the template** — edit `src/templates/registry.ts` to add the import and array entry:

```ts
import type { Template } from "./types";
import { classicTemplate } from "./classic";
import { meridianTemplate } from "./meridian";
import { quillTemplate } from "./quill";

export const templates: Template[] = [classicTemplate, meridianTemplate, quillTemplate];

export const defaultTemplate = templates[0];
```

And edit `src/documents/resume/index.ts` to import `quillTemplate` and append it to `templates`:

```ts
import { quillTemplate } from "../../templates/quill";
// …
  templates: [classicTemplate, meridianTemplate, quillTemplate],
```

- [ ] **Step 10: Run Quill's tests**

Run: `pnpm exec vitest run src/templates/quill`
Expected: PASS.

- [ ] **Step 11: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 12: Checkpoint** — leave changes for the user to review/commit.

---

## Task 6: Ledger template (compact / dense)

**Files:**
- Create: `src/templates/ledger/LedgerPreview.tsx`
- Create: `src/templates/ledger/ledger.css`
- Create: `src/templates/ledger/index.ts`
- Create: `src/templates/ledger/LedgerPreview.test.tsx`
- Create: `src/templates/ledger/index.test.tsx`
- Modify: `src/templates/registry.ts`
- Modify: `src/documents/resume/index.ts`

**Interfaces:**
- Produces: `ledgerTemplate: Template` (id `"ledger"`, default variant `{ colorId: "charcoal", fontId: "classic" }`).

- [ ] **Step 1: Write the failing Preview test** — `src/templates/ledger/LedgerPreview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LedgerPreview from "./LedgerPreview";
import { sampleResume } from "@/data/resume";

describe("LedgerPreview", () => {
  it("renders the page root and the name", () => {
    const { container } = render(<LedgerPreview data={sampleResume} />);
    expect(container.querySelector(".resume-page.ledger")).not.toBeNull();
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("applies the selected variant to the page root", () => {
    const { container } = render(
      <LedgerPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("defaults to navy + Source Serif when no variant is passed", () => {
    const { container } = render(<LedgerPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("applies a per-field font override inline, winning over the pairing", () => {
    render(
      <LedgerPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora", "experience.exp-1.role": "plexMono" }}
      />,
    );
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toHaveStyle({
      fontFamily: '"Lora", Georgia, serif',
    });
    expect(screen.getByText("Staff Software Engineer")).toHaveStyle({
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/ledger/LedgerPreview.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Preview** — `src/templates/ledger/LedgerPreview.tsx`:

```tsx
import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./ledger.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function LedgerPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page ledger" style={themeCssVars(resolveVariant(variant))}>
      <header className="ldg-head">
        <div>
          <h1 className="resume-name" style={f("name")}>{data.name}</h1>
          {data.headline && <div className="ldg-headline" style={f("headline")}>{data.headline}</div>}
        </div>
        {parts.length > 0 && (
          <div className="ldg-contact">
            {parts.map((p) => (
              <div key={p.key} style={f(joinPath("contact", p.key))}>{p.value}</div>
            ))}
          </div>
        )}
      </header>

      <div className="ldg-body">
        {data.summary.trim() && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h">Summary</h2>
            <div className="ldg-sec-body">
              <p className="ldg-summary" style={f("summary")}>{data.summary}</p>
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h">Experience</h2>
            <div className="ldg-sec-body">
              {data.experience.map((item) => {
                const base = joinPath("experience", item.id);
                return (
                  <div className="ldg-item" key={item.id}>
                    <div className="ldg-line">
                      <span className="ldg-line-title">
                        <span className="ldg-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                        {item.company && (
                          <span className="ldg-org">
                            {" — "}
                            <span style={f(joinPath(base, "company"))}>{item.company}</span>
                            {item.location && (
                              <span className="ldg-loc" style={f(joinPath(base, "location"))}>, {item.location}</span>
                            )}
                          </span>
                        )}
                      </span>
                      <span className="ldg-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? "–" : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    {item.bullets.filter((b) => b.trim()).length > 0 && (
                      <ul className="ldg-bullets" style={f(joinPath(base, "bullets"))}>
                        {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.education.length > 0 && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h">Education</h2>
            <div className="ldg-sec-body">
              {data.education.map((item) => {
                const base = joinPath("education", item.id);
                return (
                  <div className="ldg-item" key={item.id}>
                    <div className="ldg-line">
                      <span className="ldg-line-title">
                        <span className="ldg-role" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                        {item.degree && (
                          <span className="ldg-org">
                            {" — "}
                            <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                          </span>
                        )}
                      </span>
                      <span className="ldg-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? "–" : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    {item.detail.trim() && (
                      <div className="ldg-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h">Skills</h2>
            <div className="ldg-sec-body">
              {data.skills.map((g) => {
                const base = joinPath("skills", g.id);
                return (
                  <div className="ldg-skill-row" key={g.id}>
                    <span className="ldg-skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                    <span className="ldg-skill-val" style={f(joinPath(base, "items"))}>
                      {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default LedgerPreview;
```

- [ ] **Step 4: Create the CSS** — `src/templates/ledger/ledger.css`:

```css
/* Ledger — compact, dense, one page; tabular-aligned dates. */
.resume-page.ledger {
  width: var(--page-w);
  min-height: var(--page-h);
  box-sizing: border-box;
  padding: 34pt 50pt 30pt;
  background: #ffffff;
  color: var(--c-ink);
  font-family: var(--f-sans);
  font-size: 8.8pt;
  line-height: 11.6pt;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.ldg-head {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 16pt;
  border-bottom: 1.5pt solid var(--c-accent); padding-bottom: 8pt;
}
.ledger .resume-name {
  margin: 0; font-family: var(--f-serif); font-weight: 700;
  font-size: 20pt; line-height: 1.02; color: var(--c-ink);
}
.ldg-headline {
  margin: 3pt 0 0; font-size: 9.5pt; font-weight: 600; color: var(--c-accent);
  text-transform: uppercase; letter-spacing: 0.6pt;
}
.ldg-contact {
  text-align: right; font-size: 8pt; color: var(--c-muted);
  line-height: 1.5; font-variant-numeric: tabular-nums;
}
.ldg-body { margin-top: 10pt; }
.ldg-section { margin-top: 10pt; }
.ldg-section:first-child { margin-top: 0; }
.ldg-sec-h {
  margin: 0; font-size: 8.4pt; text-transform: uppercase; letter-spacing: 0.8pt;
  font-weight: 700; color: var(--c-accent);
  border-bottom: var(--rule-w) solid var(--c-rule); padding-bottom: 2.5pt;
}
.ldg-sec-body { margin-top: 5pt; }
.ldg-summary { margin: 0; color: var(--c-ink); line-height: 1.35; }
.ldg-item + .ldg-item { margin-top: 5.5pt; }
.ldg-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.ldg-line-title { min-width: 0; }
.ldg-role { font-weight: 600; font-size: 9pt; color: var(--c-ink); }
.ldg-org { color: var(--c-accent); font-size: 8.8pt; }
.ldg-loc { color: var(--c-muted); }
.ldg-date {
  flex: none; font-size: 8pt; color: var(--c-faint);
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
.ldg-bullets { margin: 3pt 0 0; padding: 0; list-style: none; }
.ldg-bullets li { position: relative; padding-left: 10pt; color: var(--c-ink); line-height: 1.3; }
.ldg-bullets li + li { margin-top: 2pt; }
.ldg-bullets li::before {
  content: ""; position: absolute; left: 1.5pt; top: 4.6pt;
  width: 2pt; height: 2pt; border-radius: 50%; background: var(--c-accent);
}
.ldg-detail { margin-top: 2pt; font-size: 8.4pt; color: var(--c-muted); }
.ldg-skill-row { display: flex; gap: 6pt; }
.ldg-skill-row + .ldg-skill-row { margin-top: 3pt; }
.ldg-skill-label { flex: none; width: 84pt; font-weight: 600; color: var(--c-ink); }
.ldg-skill-val { color: var(--c-muted); }
```

- [ ] **Step 5: Run the Preview test to confirm it passes**

Run: `pnpm exec vitest run src/templates/ledger/LedgerPreview.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing index test** — `src/templates/ledger/index.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { ledgerTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("ledger template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await ledgerTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <ledgerTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full catalog and a charcoal/classic default", () => {
    expect(ledgerTemplate.id).toBe("ledger");
    expect(ledgerTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(ledgerTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(ledgerTemplate.variants.default).toEqual({ colorId: "charcoal", fontId: "classic" });
  });
});
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/ledger/index.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 8: Create the index** — `src/templates/ledger/index.ts`:

```ts
import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

export const ledgerTemplate = lazyTemplate(
  {
    id: "ledger",
    name: "Ledger",
    description: "Compact, dense, one page",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "charcoal", fontId: "classic" } },
  },
  () => import("./LedgerPreview"),
);
```

- [ ] **Step 9: Register the template** — edit `src/templates/registry.ts`:

```ts
import { ledgerTemplate } from "./ledger";
// …array:
export const templates: Template[] = [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate];
```

And edit `src/documents/resume/index.ts`:

```ts
import { ledgerTemplate } from "../../templates/ledger";
// …
  templates: [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate],
```

- [ ] **Step 10: Run Ledger's tests**

Run: `pnpm exec vitest run src/templates/ledger`
Expected: PASS.

- [ ] **Step 11: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 12: Checkpoint** — leave changes for the user to review/commit.

---

## Task 7: Atlas template (two-column sidebar)

**Files:**
- Create: `src/templates/atlas/AtlasPreview.tsx`
- Create: `src/templates/atlas/atlas.css`
- Create: `src/templates/atlas/index.ts`
- Create: `src/templates/atlas/AtlasPreview.test.tsx`
- Create: `src/templates/atlas/index.test.tsx`
- Modify: `src/templates/registry.ts`
- Modify: `src/documents/resume/index.ts`

**Interfaces:**
- Consumes: `--c-accent-soft` (Task 2) for the sidebar tint.
- Produces: `atlasTemplate: Template` (id `"atlas"`, default variant `{ colorId: "navy", fontId: "modern" }`).

- [ ] **Step 1: Write the failing Preview test** — `src/templates/atlas/AtlasPreview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AtlasPreview from "./AtlasPreview";
import { sampleResume } from "@/data/resume";

describe("AtlasPreview", () => {
  it("renders the page root and the name", () => {
    const { container } = render(<AtlasPreview data={sampleResume} />);
    expect(container.querySelector(".resume-page.atlas")).not.toBeNull();
    expect(container.querySelector(".atl-side")).not.toBeNull();
    expect(container.querySelector(".atl-main")).not.toBeNull();
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
  });

  it("applies the selected variant to the page root", () => {
    const { container } = render(
      <AtlasPreview data={sampleResume} variant={{ colorId: "burgundy", fontId: "editorial" }} />,
    );
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#7c2d3a");
    expect(page.style.getPropertyValue("--c-accent-soft")).toBe("#f5eeef");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"Playfair Display", Georgia, serif');
  });

  it("defaults to navy + Source Serif when no variant is passed", () => {
    const { container } = render(<AtlasPreview data={sampleResume} />);
    const page = container.querySelector(".resume-page") as HTMLElement;
    expect(page.style.getPropertyValue("--c-accent")).toBe("#1f3a5f");
    expect(page.style.getPropertyValue("--f-serif")).toBe('"SourceSerif", Georgia, serif');
  });

  it("applies a per-field font override inline, winning over the pairing", () => {
    render(
      <AtlasPreview
        data={sampleResume}
        variant={{ colorId: "navy", fontId: "modern" }}
        fontOverrides={{ name: "lora", "experience.exp-1.role": "plexMono" }}
      />,
    );
    expect(screen.getByRole("heading", { name: sampleResume.name, level: 1 })).toHaveStyle({
      fontFamily: '"Lora", Georgia, serif',
    });
    expect(screen.getByText("Staff Software Engineer")).toHaveStyle({
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/atlas/AtlasPreview.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Preview** — `src/templates/atlas/AtlasPreview.tsx`:

```tsx
import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./atlas.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function AtlasPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page atlas" style={themeCssVars(resolveVariant(variant))}>
      <aside className="atl-side">
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && <div className="atl-headline" style={f("headline")}>{data.headline}</div>}

        {parts.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Contact</h2>
            {parts.map((p) => (
              <div className="atl-contact-line" key={p.key} style={f(joinPath("contact", p.key))}>{p.value}</div>
            ))}
          </div>
        )}

        {data.skills.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Skills</h2>
            {data.skills.map((g) => {
              const base = joinPath("skills", g.id);
              return (
                <div className="atl-skill" key={g.id}>
                  <div className="atl-skill-label" style={f(joinPath(base, "label"))}>{g.label}</div>
                  <div className="atl-skill-val" style={f(joinPath(base, "items"))}>
                    {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data.education.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Education</h2>
            {data.education.map((item) => {
              const base = joinPath("education", item.id);
              return (
                <div className="atl-edu" key={item.id}>
                  <div className="atl-edu-deg" style={f(joinPath(base, "degree"))}>{item.degree}</div>
                  <div className="atl-edu-inst" style={f(joinPath(base, "institution"))}>{item.institution}</div>
                  <div className="atl-edu-meta">
                    <span style={f(joinPath(base, "start"))}>{item.start}</span>
                    {item.start && item.end ? " – " : ""}
                    <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    {item.location && (
                      <>
                        {" · "}
                        <span style={f(joinPath(base, "location"))}>{item.location}</span>
                      </>
                    )}
                  </div>
                  {item.detail.trim() && (
                    <div className="atl-edu-meta" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <main className="atl-main">
        {data.summary.trim() && (
          <div className="atl-block">
            <h2 className="atl-h">Summary</h2>
            <p className="atl-summary" style={f("summary")}>{data.summary}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Experience</h2>
            {data.experience.map((item) => {
              const base = joinPath("experience", item.id);
              return (
                <div className="atl-item" key={item.id}>
                  <div className="atl-item-header">
                    <span className="atl-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                    <span className="atl-date">
                      <span style={f(joinPath(base, "start"))}>{item.start}</span>
                      {item.start && item.end ? " – " : ""}
                      <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    </span>
                  </div>
                  <div className="atl-org">
                    <span style={f(joinPath(base, "company"))}>{item.company}</span>
                    {item.location && (
                      <span className="atl-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                    )}
                  </div>
                  {item.bullets.filter((b) => b.trim()).length > 0 && (
                    <ul className="atl-bullets" style={f(joinPath(base, "bullets"))}>
                      {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default AtlasPreview;
```

- [ ] **Step 4: Create the CSS** — `src/templates/atlas/atlas.css`:

```css
/* Atlas — two-column: tinted sidebar (contact/skills/education) + main column. */
.resume-page.atlas {
  width: var(--page-w);
  min-height: var(--page-h);
  box-sizing: border-box;
  padding: 0;
  display: grid;
  grid-template-columns: 200pt 1fr;
  background: #ffffff;
  color: var(--c-ink);
  font-family: var(--f-sans);
  font-size: var(--s-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.atl-side {
  background: var(--c-accent-soft);
  border-right: var(--rule-w) solid var(--c-rule);
  padding: 34pt 22pt;
}
.atlas .resume-name {
  margin: 0; font-family: var(--f-serif); font-weight: 700;
  font-size: 20pt; line-height: 1.05; color: var(--c-accent);
}
.atl-headline {
  margin: 5pt 0 0; font-size: var(--s-headline); text-transform: uppercase;
  letter-spacing: 0.6pt; color: var(--c-muted);
}
.atl-block { margin-top: 18pt; }
.atl-h { margin: 0 0 6pt; font-size: 8.6pt; text-transform: uppercase; letter-spacing: 1pt; font-weight: 700; color: var(--c-accent); }
.atl-contact-line { font-size: 8.6pt; color: var(--c-muted); line-height: var(--lh-contact); margin-top: 3pt; overflow-wrap: anywhere; }
.atl-contact-line:first-of-type { margin-top: 0; }
.atl-skill { margin-top: 6pt; }
.atl-skill:first-of-type { margin-top: 0; }
.atl-skill-label { font-weight: 600; font-size: 8.8pt; color: var(--c-ink); }
.atl-skill-val { font-size: 8.6pt; color: var(--c-muted); line-height: 1.4; margin-top: 1pt; }
.atl-edu + .atl-edu { margin-top: 8pt; }
.atl-edu-deg { font-size: 8.8pt; font-weight: 600; color: var(--c-ink); }
.atl-edu-inst { font-size: 8.6pt; color: var(--c-accent); margin-top: 1pt; }
.atl-edu-meta { font-size: 8.4pt; color: var(--c-muted); margin-top: 1pt; }
.atl-main { padding: 34pt 26pt; }
.atl-main .atl-block:first-child { margin-top: 0; }
.atl-main .atl-h { border-bottom: var(--rule-w) solid var(--c-rule); padding-bottom: 4pt; margin-bottom: 8pt; }
.atl-summary { margin: 0; color: var(--c-ink); }
.atl-item + .atl-item { margin-top: 10pt; }
.atl-item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 10pt; }
.atl-role { font-weight: 600; font-size: var(--s-role); color: var(--c-ink); }
.atl-date { flex: none; font-size: var(--s-date); color: var(--c-faint); white-space: nowrap; }
.atl-org { margin-top: var(--sp-after-item-header); font-size: var(--s-org); color: var(--c-accent); }
.atl-loc { color: var(--c-muted); }
.atl-bullets { margin: var(--sp-after-org) 0 0; padding: 0; list-style: none; }
.atl-bullets li { position: relative; padding-left: var(--bullet-indent); color: var(--c-ink); }
.atl-bullets li + li { margin-top: var(--sp-bullet-gap); }
.atl-bullets li::before {
  content: ""; position: absolute; left: 2pt; top: calc(var(--lh-body) / 2 - 1pt);
  width: 2.4pt; height: 2.4pt; border-radius: 50%; background: var(--c-accent);
}
```

- [ ] **Step 5: Run the Preview test to confirm it passes**

Run: `pnpm exec vitest run src/templates/atlas/AtlasPreview.test.tsx`
Expected: PASS.

- [ ] **Step 6: Write the failing index test** — `src/templates/atlas/index.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { atlasTemplate } from "./index";
import { sampleResume } from "../../data/resume";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

describe("atlas template (lazy-loaded)", () => {
  it("preload() resolves the chunk to a component that renders the resume", async () => {
    const Loaded = await atlasTemplate.preload();
    render(<Loaded data={sampleResume} />);
    expect(screen.getByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="template-loading" />}>
        <atlasTemplate.Preview data={sampleResume} />
      </Suspense>,
    );
    expect(screen.getByTestId("template-loading")).toBeInTheDocument();
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("exposes the full catalog and a navy/modern default", () => {
    expect(atlasTemplate.id).toBe("atlas");
    expect(atlasTemplate.variants.colors).toBe(COLOR_SCHEMES);
    expect(atlasTemplate.variants.fonts).toBe(FONT_PAIRINGS);
    expect(atlasTemplate.variants.default).toEqual({ colorId: "navy", fontId: "modern" });
  });
});
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `pnpm exec vitest run src/templates/atlas/index.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 8: Create the index** — `src/templates/atlas/index.ts`:

```ts
import { lazyTemplate } from "../lazyTemplate";
import { resumeSchema } from "../../documents/resume/schema";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../../theme/variants";

export const atlasTemplate = lazyTemplate(
  {
    id: "atlas",
    name: "Atlas",
    description: "Two-column sidebar",
    schema: resumeSchema,
    variants: { colors: COLOR_SCHEMES, fonts: FONT_PAIRINGS, default: { colorId: "navy", fontId: "modern" } },
  },
  () => import("./AtlasPreview"),
);
```

- [ ] **Step 9: Register the template** — edit `src/templates/registry.ts` to its final form:

```ts
import type { Template } from "./types";
import { classicTemplate } from "./classic";
import { meridianTemplate } from "./meridian";
import { quillTemplate } from "./quill";
import { ledgerTemplate } from "./ledger";
import { atlasTemplate } from "./atlas";

export const templates: Template[] = [
  classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate,
];

export const defaultTemplate = templates[0];
```

And edit `src/documents/resume/index.ts` to its final form:

```ts
import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/classic";
import { meridianTemplate } from "../../templates/meridian";
import { quillTemplate } from "../../templates/quill";
import { ledgerTemplate } from "../../templates/ledger";
import { atlasTemplate } from "../../templates/atlas";

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "resume",
  defaultData: sampleResume,
  templates: [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate],
};
```

- [ ] **Step 10: Run Atlas's tests**

Run: `pnpm exec vitest run src/templates/atlas`
Expected: PASS.

- [ ] **Step 11: Type-check**

Run: `pnpm build`
Expected: 0 errors.

- [ ] **Step 12: Atlas PDF export verification gate (MANDATORY — browser only).** Atlas is the one multi-column layout; per `CLAUDE.md`, `pnpm preview` is the source of truth for PDF output (not `pnpm dev`).

```bash
pnpm build && pnpm preview
```

Then in a browser at the preview URL, open `/build/resume/atlas`, click **Download PDF**, save as `atlas.pdf`, and verify:

```bash
pdffonts atlas.pdf          # expect the variant's fonts "emb yes ... uni yes"; NO Helvetica fallback
pdftotext atlas.pdf -       # expect readable, correctly-ordered text (sidebar + main both present, not gibberish)
node scripts/inspect-pdf.mjs atlas.pdf   # expect VECTOR verdict, 0 images
```

Visually confirm in the PDF: (a) columns render side-by-side (not stacked/overlapping), (b) the sidebar tint reaches the content bottom with no white gap. If any check fails and reasonable layout adjustments (e.g. sidebar width, reducing sidebar content, ensuring grid stretch) can't fix it, STOP and report — per the spec we ship Meridian/Quill/Ledger and flag Atlas rather than ship a broken PDF.

- [ ] **Step 13: Checkpoint** — leave changes for the user to review/commit.

---

## Task 8: Registry coverage + full verification

**Files:**
- Create: `src/templates/registry.test.ts`

**Interfaces:**
- Consumes: `templates` from `src/templates/registry.ts`.

- [ ] **Step 1: Write the registry test** — `src/templates/registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { templates, defaultTemplate } from "./registry";
import { COLOR_SCHEMES, FONT_PAIRINGS } from "../theme/variants";

describe("template registry", () => {
  it("ships the five templates in gallery order with unique ids", () => {
    expect(templates.map((t) => t.id)).toEqual([
      "classic", "meridian", "quill", "ledger", "atlas",
    ]);
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
    expect(defaultTemplate).toBe(templates[0]);
  });

  it("gives every template a non-empty variant catalog and a valid default", () => {
    const colorIds = new Set(COLOR_SCHEMES.map((c) => c.id));
    const fontIds = new Set(FONT_PAIRINGS.map((f) => f.id));
    for (const t of templates) {
      expect(t.variants.colors.length).toBeGreaterThan(0);
      expect(t.variants.fonts.length).toBeGreaterThan(0);
      expect(colorIds.has(t.variants.default.colorId)).toBe(true);
      expect(fontIds.has(t.variants.default.fontId)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the registry test**

Run: `pnpm exec vitest run src/templates/registry.test.ts`
Expected: PASS.

- [ ] **Step 3: Run the FULL test suite**

Run: `pnpm exec vitest run`
Expected: PASS (all files, including the pre-existing ones).

- [ ] **Step 4: Type-check + production build**

Run: `pnpm build`
Expected: `astro check` 0 errors; static build into `dist/` succeeds. This also confirms `getStaticPaths` generated `/build/resume/{classic,meridian,quill,ledger,atlas}`.

- [ ] **Step 5: Manual gallery + single-page check (browser).**

```bash
pnpm preview
```

At the preview URL, open `/create`: confirm five cards (Classic, Meridian, Quill, Ledger, Atlas), each thumbnail rendered in ITS default variant (Quill in charcoal/Playfair, Atlas in navy/Plex Sans, etc.) and NOT bleeding Classic's styling. Open each `/build/resume/<id>`, confirm the design matches its mockup and the sample resume fits on one page. Download a PDF from Meridian, Quill, and Ledger and spot-check with `pdffonts`/`pdftotext` (Atlas was covered by Task 7's gate).

- [ ] **Step 6: Checkpoint** — leave all changes for the user to review/commit.

---

## Self-Review (completed by plan author)

- **Spec coverage:** Four templates (Tasks 4–7); per-template variants + defaults (index files + index tests); `--c-accent-soft` for Atlas (Task 2); shared schema extraction (Task 1); TemplateCard default-variant thumbnails (Task 3); registry/document wiring (Tasks 4–7) + coverage test (Task 8); Atlas export-verification gate (Task 7 Step 12); full verification (Task 8). All spec sections map to a task.
- **Placeholder scan:** No TBD/TODO; every code step contains complete code; no "similar to Task N" (each template is written in full).
- **Type consistency:** All templates use the `{ data, fontOverrides?, variant? }` prop shape and default `variant = DEFAULT_VARIANT`; index files use `lazyTemplate(meta, () => import("./<Name>Preview"))`; variant defaults referenced identically in index files and index tests; `--c-accent-soft` produced in Task 2 and consumed in Task 7's CSS + asserted in Task 7's Preview test (`#f5eeef` for burgundy, matching Task 2's assertion).
