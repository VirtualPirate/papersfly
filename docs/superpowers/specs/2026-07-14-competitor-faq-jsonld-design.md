# Competitor FAQ JSON-LD (FAQPage) — Design

Date: 2026-07-14

## Problem

The `/vs/<competitor>` comparison pages each render a visible FAQ **and** emit it
as JSON-LD — but under `@type: "QAPage"`. `QAPage` is the wrong Schema.org type
for this content: it describes pages where *users submit answers* (forums,
community Q&A). Our FAQs are *site-authored*, so the correct, SEO-eligible type is
`FAQPage`. The `/alternatives` hub page has no FAQ at all.

## Goal

1. Emit every competitor FAQ as valid `FAQPage` JSON-LD (structurally identical to
   the reference example: `FAQPage` → `Question[]` → `acceptedAnswer` → `Answer`,
   with the answer text wrapped in `<p>…</p>`).
2. Add a short, honest, general FAQ to the `/alternatives` hub, rendered visibly and
   emitted as `FAQPage` too.

Non-goals: no change to the visible design of the `/vs` FAQ section; no new
per-competitor FAQ content; no change to the existing breadcrumb / SoftwareApplication
/ ItemList JSON-LD.

## Approach

### Shared helper (single source of truth for the FAQPage shape)

Add a small exported helper to `src/data/competitors.ts` so both pages build the
schema identically:

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

`competitors.ts` already exports a function (`getCompetitor`), so a helper alongside
the data is consistent with the module. The answer text is plain prose today; wrapping
in `<p>` matches the reference example and is valid HTML content for the `text` field.

### `/vs/[competitor].astro`

- Replace the inline `qaPage` (`QAPage`) object with `const faqPage = faqPageJsonLd(c.faq);`.
- Update `extraJsonLd={[breadcrumb, faqPage]}`.
- Visible FAQ section unchanged (its content mirrors the structured data — required by Google).

### `/alternatives.astro`

- Add an exported `ALTERNATIVES_FAQ` array to `competitors.ts` (content lives in the data layer, not the template).
- Render it in a visible FAQ section reusing the existing `cmp-rule-h` / `cmp-faq` markup from the `/vs` page.
- Add `faqPageJsonLd(ALTERNATIVES_FAQ)` to the page's `extraJsonLd`.

### Comment cleanup

`competitors.ts` line ~66 comment "QAPage-adjacent prose" → "FAQPage prose".

## Proposed `/alternatives` FAQ content (site-authored, verified against `competitors.ts`)

**Q: Which résumé builders are actually free?**
A: Only a handful let you download a real, formatted PDF at no cost with no catch.
papersfly, Canva, FlowCV, Teal and Standard Resume offer genuinely free PDF
downloads; Novoresume, Enhancv and VisualCV stamp a watermark or branding on the
free tier; Rezi and Kickresume cap how many times you can download; and Zety and
Resume.io only export plain text for free, paywalling the formatted PDF. Of the free
options, papersfly is the only one that needs no account and uploads nothing.

**Q: What does "ATS-safe" mean?**
A: An applicant tracking system (ATS) is the software employers use to scan résumés
before a human sees them. An ATS-safe résumé uses a single-column layout and real,
selectable text — not words baked into images or hidden in multi-column graphics — so
the parser reads your name, roles and dates correctly. Most builders here export
ATS-readable PDFs; Canva's popular multi-column, graphic-heavy templates are the main
exception.

**Q: Which résumé builder keeps my data private?**
A: Every mainstream builder except papersfly is a cloud tool: you create an account
and your résumé is stored on their servers. papersfly is private by architecture —
there is no account and nothing is uploaded. Your document is built, rendered and
exported entirely in your browser, and it works offline after the first load.

**Q: Do I have to create an account to build a résumé?**
A: For most builders on this page, yes — an account is required and your data is saved
to the cloud. papersfly needs no signup: you open it and start building, and nothing
is transmitted.

**Q: Can I download a résumé PDF for free without a watermark?**
A: Yes, with papersfly — exports are unlimited, unbranded and watermark-free.
Novoresume, Enhancv and VisualCV add a watermark or branding on free downloads, and
Zety and Resume.io only give you plain text for free, so a clean PDF from those
requires paying.

## Verification

- `pnpm build` (astro check) passes — no type errors from the new helper/exports.
- Spot-check generated HTML for one `/vs` page and `/alternatives`: a
  `<script type="application/ld+json">` with `"@type":"FAQPage"` and one
  `Question`/`acceptedAnswer` per entry.
- No remaining references to `QAPage` / `qaPage` in the repo.
- (Optional) Paste output into Google's Rich Results Test / Schema validator.

## Files touched

- `src/data/competitors.ts` — add `faqPageJsonLd()`, `ALTERNATIVES_FAQ`; fix comment.
- `src/pages/vs/[competitor].astro` — `QAPage` → `FAQPage` via helper.
- `src/pages/alternatives.astro` — visible FAQ section + `FAQPage` JSON-LD.
