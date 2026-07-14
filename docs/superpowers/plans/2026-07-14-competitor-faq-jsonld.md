# Competitor FAQ JSON-LD (FAQPage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit every competitor FAQ (the `/vs/<competitor>` pages) and a new `/alternatives` hub FAQ as valid Schema.org `FAQPage` JSON-LD, replacing the incorrect `QAPage` type.

**Architecture:** A single pure helper `faqPageJsonLd(faq)` in the data module builds the `FAQPage` node; both the per-competitor page and the hub page consume it. The hub gains a small site-authored FAQ (data in `competitors.ts`, rendered with the existing `cmp-faq` markup).

**Tech Stack:** Astro (static pages), TypeScript, vitest (for the pure helper). JSON-LD rendered by `BaseLayout` via `extraJsonLd` — each node becomes its own `<script type="application/ld+json">`.

## Global Constraints

- Package manager is **pnpm**. Run tests with `pnpm exec vitest run <file>`; build with `pnpm build`.
- **Do NOT run `git commit`** — the user handles all commits. Each task ends on a verification step.
- Answer text in the JSON-LD is wrapped in `<p>…</p>` (matches the reference example; `Answer.text` accepts HTML).
- `competitors.ts` is the content/data layer — new FAQ *content* and the schema helper live there, not in the `.astro` templates.
- Structured-data content must mirror visible on-page content — every FAQ emitted as JSON-LD is also rendered visibly.
- All FAQ claims must stay verifiable against the facts already in `competitors.ts` (pricing/freeDownload/noSignup/onDevice).

---

### Task 1: `faqPageJsonLd` helper + comment cleanup

**Files:**
- Modify: `src/data/competitors.ts` (add helper near the bottom, next to `getCompetitor`; fix the "QAPage-adjacent" comment ~line 66)
- Test: `src/data/competitors.test.ts` (create)

**Interfaces:**
- Consumes: the existing `{ q: string; a: string }[]` FAQ shape (same as `Competitor.faq`).
- Produces: `faqPageJsonLd(faq: { q: string; a: string }[]): { "@context": string; "@type": "FAQPage"; mainEntity: object[] }` — imported by both pages in Tasks 3 & 4.

- [ ] **Step 1: Write the failing test**

Create `src/data/competitors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { faqPageJsonLd } from "./competitors";

describe("faqPageJsonLd", () => {
  it("builds a FAQPage node with one Question per entry, answers wrapped in <p>", () => {
    const node = faqPageJsonLd([
      { q: "Is it free?", a: "Yes, entirely." },
      { q: "Any signup?", a: "No account needed." },
    ]);
    expect(node["@context"]).toBe("https://schema.org");
    expect(node["@type"]).toBe("FAQPage");
    expect(node.mainEntity).toHaveLength(2);
    expect(node.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: { "@type": "Answer", text: "<p>Yes, entirely.</p>" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/data/competitors.test.ts`
Expected: FAIL — `faqPageJsonLd` is not exported / not a function.

- [ ] **Step 3: Write minimal implementation**

In `src/data/competitors.ts`, add above (or below) the existing `getCompetitor` function:

```ts
/** Build a Schema.org FAQPage node from a list of Q&A pairs. */
export function faqPageJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: `<p>${f.a}</p>` },
    })),
  };
}
```

Also fix the stale comment on the `faq` field of the `Competitor` interface (currently `/** Page-specific FAQ (also emitted as QAPage-adjacent prose). */`):

```ts
  /** Page-specific FAQ (rendered visibly and emitted as FAQPage JSON-LD). */
  faq: { q: string; a: string }[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/data/competitors.test.ts`
Expected: PASS.

---

### Task 2: `ALTERNATIVES_FAQ` hub content

**Files:**
- Modify: `src/data/competitors.ts` (add exported `ALTERNATIVES_FAQ`)
- Test: `src/data/competitors.test.ts` (extend)

**Interfaces:**
- Produces: `export const ALTERNATIVES_FAQ: { q: string; a: string }[]` — consumed by `/alternatives.astro` in Task 4.

- [ ] **Step 1: Write the failing test**

Append to `src/data/competitors.test.ts`:

```ts
import { faqPageJsonLd, ALTERNATIVES_FAQ } from "./competitors";

describe("ALTERNATIVES_FAQ", () => {
  it("has at least 4 non-empty Q&A entries", () => {
    expect(ALTERNATIVES_FAQ.length).toBeGreaterThanOrEqual(4);
    for (const f of ALTERNATIVES_FAQ) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.a.trim().length).toBeGreaterThan(0);
    }
  });

  it("produces a valid FAQPage when passed through the helper", () => {
    const node = faqPageJsonLd(ALTERNATIVES_FAQ);
    expect(node["@type"]).toBe("FAQPage");
    expect(node.mainEntity.length).toBe(ALTERNATIVES_FAQ.length);
  });
});
```

(Adjust the existing `import { faqPageJsonLd } from "./competitors";` line to also import `ALTERNATIVES_FAQ`, or add this second import — TypeScript allows both.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/data/competitors.test.ts`
Expected: FAIL — `ALTERNATIVES_FAQ` is undefined.

- [ ] **Step 3: Write the data**

In `src/data/competitors.ts`, add after the `competitors` array (before `getCompetitor`):

```ts
/**
 * General, site-authored FAQ for the /alternatives hub. Rendered visibly and
 * emitted as FAQPage JSON-LD. Every claim is verifiable against the per-competitor
 * facts above (quick.freeDownload / noSignup / onDevice / price).
 */
export const ALTERNATIVES_FAQ: { q: string; a: string }[] = [
  {
    q: "Which résumé builders are actually free?",
    a: "Only a handful let you download a real, formatted PDF at no cost with no catch. papersfly, Canva, FlowCV, Teal and Standard Resume offer genuinely free PDF downloads; Novoresume, Enhancv and VisualCV stamp a watermark or branding on the free tier; Rezi and Kickresume cap how many times you can download; and Zety and Resume.io only export plain text for free, paywalling the formatted PDF. Of the free options, papersfly is the only one that needs no account and uploads nothing.",
  },
  {
    q: "What does “ATS-safe” mean?",
    a: "An applicant tracking system (ATS) is the software employers use to scan résumés before a human sees them. An ATS-safe résumé uses a single-column layout and real, selectable text — not words baked into images or hidden in multi-column graphics — so the parser reads your name, roles and dates correctly. Most builders here export ATS-readable PDFs; Canva's popular multi-column, graphic-heavy templates are the main exception.",
  },
  {
    q: "Which résumé builder keeps my data private?",
    a: "Every mainstream builder except papersfly is a cloud tool: you create an account and your résumé is stored on their servers. papersfly is private by architecture — there is no account and nothing is uploaded. Your document is built, rendered and exported entirely in your browser, and it works offline after the first load.",
  },
  {
    q: "Do I have to create an account to build a résumé?",
    a: "For most builders on this page, yes — an account is required and your data is saved to the cloud. papersfly needs no signup: you open it and start building, and nothing is transmitted.",
  },
  {
    q: "Can I download a résumé PDF for free without a watermark?",
    a: "Yes, with papersfly — exports are unlimited, unbranded and watermark-free. Novoresume, Enhancv and VisualCV add a watermark or branding on free downloads, and Zety and Resume.io only give you plain text for free, so a clean PDF from those requires paying.",
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/data/competitors.test.ts`
Expected: PASS (all describe blocks).

---

### Task 3: Switch `/vs/[competitor].astro` to FAQPage

**Files:**
- Modify: `src/pages/vs/[competitor].astro` (import, the `qaPage`→`faqPage` block, the `extraJsonLd` prop)

**Interfaces:**
- Consumes: `faqPageJsonLd` from Task 1.

- [ ] **Step 1: Add the helper to the import**

Change the import on line 8 from:

```ts
import { competitors, CAPABILITIES, PAPERSFLY_GAINS, PRICING_AS_OF } from "../../data/competitors";
```

to:

```ts
import { competitors, CAPABILITIES, PAPERSFLY_GAINS, PRICING_AS_OF, faqPageJsonLd } from "../../data/competitors";
```

- [ ] **Step 2: Replace the `qaPage` block with `faqPage`**

Replace this block (lines ~57-65):

```ts
const qaPage = {
  "@context": "https://schema.org",
  "@type": "QAPage",
  mainEntity: c.faq.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};
```

with:

```ts
const faqPage = faqPageJsonLd(c.faq);
```

- [ ] **Step 3: Update the `extraJsonLd` prop**

Change line ~74 from `extraJsonLd={[breadcrumb, qaPage]}` to:

```astro
  extraJsonLd={[breadcrumb, faqPage]}
```

- [ ] **Step 4: Build and verify the emitted JSON-LD**

Run: `pnpm build`
Expected: build succeeds (astro check passes — no type errors).

Then verify one page's output:

Run: `grep -o '"@type":"FAQPage"' dist/vs/zety/index.html`
Expected: prints `"@type":"FAQPage"` (at least once).

Run: `grep -c 'QAPage' dist/vs/zety/index.html`
Expected: `0`.

---

### Task 4: Add FAQ section + FAQPage JSON-LD to `/alternatives.astro`

**Files:**
- Modify: `src/pages/alternatives.astro` (import, `faqPage` node, `extraJsonLd`, new visible FAQ section)

**Interfaces:**
- Consumes: `ALTERNATIVES_FAQ` (Task 2) and `faqPageJsonLd` (Task 1).

- [ ] **Step 1: Update the import**

Change line 8 from:

```ts
import { competitors, PRICING_AS_OF } from "../data/competitors";
```

to:

```ts
import { competitors, PRICING_AS_OF, ALTERNATIVES_FAQ, faqPageJsonLd } from "../data/competitors";
```

- [ ] **Step 2: Build the FAQPage node**

In the frontmatter, after the `itemList` const (ends ~line 38), add:

```ts
const faqPage = faqPageJsonLd(ALTERNATIVES_FAQ);
```

- [ ] **Step 3: Add it to `extraJsonLd`**

Change the `<BaseLayout ...>` opening tag (line ~41) from:

```astro
<BaseLayout title={title} description={description} extraJsonLd={[breadcrumb, itemList]}>
```

to:

```astro
<BaseLayout title={title} description={description} extraJsonLd={[breadcrumb, itemList, faqPage]}>
```

- [ ] **Step 4: Add the visible FAQ section**

Insert this new section immediately after the "Detail · head-to-head" section's closing `</section>` (the one ending ~line 138) and before `<SiteFooter />`:

```astro
    <section class="section">
      <div class="wrap">
        <div class="cmp-rule-h"><span class="lbl">FAQ</span><span class="ln"></span></div>
        <div class="cmp-faq">
          {ALTERNATIVES_FAQ.map((f) => (
            <div class="cmp-faq-item">
              <h3 class="cmp-faq-q">{f.q}</h3>
              <p class="cmp-faq-a">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
```

(The `cmp-rule-h` / `cmp-faq` / `cmp-faq-item` / `cmp-faq-q` / `cmp-faq-a` classes already exist in `marketing.css` — used by the `/vs` page, so no new CSS is needed.)

- [ ] **Step 5: Build and verify**

Run: `pnpm build`
Expected: build succeeds.

Run: `grep -o '"@type":"FAQPage"' dist/alternatives/index.html`
Expected: prints `"@type":"FAQPage"`.

Run: `grep -o 'cmp-faq-q' dist/alternatives/index.html | head -1`
Expected: prints `cmp-faq-q` (the visible FAQ rendered).

---

### Task 5: Full-repo verification

**Files:** none (verification only)

- [ ] **Step 1: No stale QAPage references remain**

Run: `grep -rn "QAPage\|qaPage" src/`
Expected: no output (exit 1).

- [ ] **Step 2: All tests pass**

Run: `pnpm test`
Expected: PASS (including `src/data/competitors.test.ts`).

- [ ] **Step 3: Confirm every /vs page emits FAQPage**

Run: `for f in dist/vs/*/index.html; do grep -q '"@type":"FAQPage"' "$f" && echo "OK $f" || echo "MISSING $f"; done`
Expected: `OK` for all 11 competitor pages, no `MISSING`.

---

## Self-Review

- **Spec coverage:** helper (Task 1), `/vs` swap (Task 3), hub content (Task 2) + hub wiring (Task 4), comment fix (Task 1), verification (Task 5) — all spec sections covered.
- **Placeholder scan:** none — all steps carry actual code/commands.
- **Type consistency:** `faqPageJsonLd(faq: { q: string; a: string }[])` used identically in Tasks 3 & 4; `ALTERNATIVES_FAQ` typed the same; `c.faq` already matches that shape.
- **Note on encoding:** the non-ASCII glyphs in `ALTERNATIVES_FAQ` (curly quotes, em dashes, `é`) are written as literal UTF-8, matching the existing convention throughout `competitors.ts` (e.g. `résumé`, `—`).
