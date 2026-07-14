# Cover letter document type + five templates — design

**Date:** 2026-07-14
**Status:** Approved demos → spec. Demos live in `design-demos/cover-letters.src.html`
(built page: `design-demos/cover-letters.html`, artifact
https://claude.ai/code/artifact/cd0f320d-7d9a-41b7-8f5c-4d7d61badbd8).

## Goal

Add a **cover letter** document kind (data + schema + AI import + routes) and
**five templates** ported 1:1 from the approved demos: **Cameo** (engraved
stationery), **Strata** (Swiss routing grid), **Carbon** (typewritten routing
block), **Missive** (salutation-led literary), **Foundry** (ghost initial).
The TODO backlog lists cover letter as the top "quickest win": it reuses the
resume identity/contact block and needs no derived math.

## 1. Data — `src/data/coverLetter.ts`

Content only, no design. Reuses `ContactInfo` from `src/data/resume.ts` (same
identity block semantics: email, phone, location, website, linkedin).

```ts
import type { ContactInfo } from "./resume";

export interface CoverLetterRecipient {
  name: string;      // "Priya Raman"
  title: string;     // "Director of Engineering"
  company: string;   // "Lumenware"
  address: string;   // one line: "550 Congress Ave, Austin, TX 78701"
}

export interface CoverLetterParagraph {
  id: string;        // list-item id (forms/update.ts newId)
  text: string;
}

export interface CoverLetterData {
  name: string;          // sender
  headline: string;      // sender role line
  contact: ContactInfo;
  date: string;          // free text ("July 14, 2026") — no date picker exists
  recipient: CoverLetterRecipient;
  subject: string;       // the "Re:" line; empty ⇒ hidden everywhere
  salutation: string;    // "Dear Ms. Raman,"
  paragraphs: CoverLetterParagraph[];
  closing: string;       // "Sincerely,"
  signature: string;     // typed signature name (defaults to full name)
}

export const sampleCoverLetter: CoverLetterData = { /* the demo letter:
  Jordan Avery Chen → Priya Raman, Lumenware, 3 paragraphs */ };
```

**Derived marks, not fields.** Cameo's monogram and Foundry's ghost initial
derive from `name` via a pure, tested helper module
`documents/cover-letter/derive.ts`:

- `monogram(name)` → first letter of first word + first letter of last word
  ("Jordan Avery Chen" → "JC"); single word → its first letter; empty → "".
- `ghostInitial(name)` → first letter of the LAST word ("C" for Chen);
  empty → "".

Empty results hide the device (empty-field guard) — no broken empty oval.

## 2. Form schema — `documents/cover-letter/schema.ts`

`builder<CoverLetterData>()`, three sections:

1. **Sender** — `name`, `headline`; contact group: `email`, `phone`,
   `location`, `website`, `linkedin` (mirroring the resume schema's contact
   rows).
2. **Recipient** — `date`; recipient group: `name`, `title`, `company`,
   `address`; `subject` (labeled "Re: line", helper text: leave blank to omit).
3. **Letter** — `salutation`; `paragraphs` as a repeatable **list** whose item
   is a single `textarea` (one paragraph per item — clean page-break units and
   clean AI import); `closing` + `signature` as a row.

No new form controls are needed.

## 3. AI import — `documents/cover-letter/importSpec.ts`

Mirror of the data minus `id`s, from the existing spec combinators:

```ts
{
  name: str(), headline: str(),
  contact: obj({ email: str(), phone: str(), location: str(), website: str(), linkedin: str() }),
  date: str(),
  recipient: obj({ name: str(), title: str(), company: str(), address: str() }),
  subject: str(), salutation: str(),
  paragraphs: list({ text: str() }),
  closing: str(), signature: str(),
}
```

## 4. Document module + registration

- `documents/cover-letter/index.ts` — `DocumentType<CoverLetterData>` with
  `id: "cover-letter"`, `name: "Cover letter"`, `defaultData: sampleCoverLetter`,
  the import spec, the five templates, and `collectText` flattening every user
  string (name, headline, all contact values, date, all recipient fields,
  subject, salutation, every paragraph, closing, signature).
- Append to `documents/registry.ts`. Builder routes
  (`/build/cover-letter/<template>/`) generate automatically from the registry.
- Remove `"Cover letter"` from `COMING_SOON_TYPES` in
  `components/create/CreateGallery.tsx`.
- **New page** `src/pages/create-cover-letter.astro` — the doc-type pill links
  to `createHref("cover-letter")` = `/create-cover-letter`; mirror
  `create-invoice.astro` (BaseLayout + CreateGallery + WebApplication and
  BreadcrumbList JSON-LD, cover-letter copy).

## 5. Templates — `src/templates/cover-letter/`

`variants.ts` (per-template palettes, invoice pattern — the demo accents are
not in the global `COLOR_SCHEMES`, so each template passes its own list to
`resolveVariant`) + five design folders, each with the standard five files
(`<Name>Preview.tsx`, `<name>.css`, `index.ts`, two test files) per
`src/templates/AGENTS.md`.

| Template | Default pairing | Default accent | `--f-serif` (display slot) carries | Signature element |
|---|---|---|---|---|
| cameo   | editorial | burgundy `#722f37` | monogram, name, signature | ruled oval monogram |
| strata  | modern    | cobalt `#1e45c0`   | sender name (wordmark)     | To/Re/Date hairline grid |
| carbon  | mono      | stamp red `#c2402a`| letterhead, routing block, signature, footer | dotted-leader routing block |
| missive | classic   | forest `#2e5d4b`   | salutation, **letter body**, closing block | 26pt serif salutation |
| foundry | classic   | navy `#16324f`     | ghost initial, signature   | 320pt ghost initial |

Each template also ships 2 alternate accents (3 per template, like invoices);
exact alternates chosen at implementation time to clear contrast on white.

Porting rules (all from the authoring guide):

- Root: `.resume-page t-<name>` + `themeCssVars(resolveVariant(variant, X_VARIANTS.colors))`;
  CSS self-contained, scoped under `.resume-page.t-<name>`, geometry in pt.
- Every `font-family` in CSS is `var(--f-serif)` / `var(--f-sans)` only
  (enforced by `fonts.test.ts`); weights only 400/600/700; no italics. Demo
  hex accents become `var(--c-accent)` (tints via `var(--c-accent-soft)` or
  literal secondary hexes where genuinely secondary).
- **Missive inversion, documented in its CSS:** the letter body routes through
  `--f-serif` — in a letter the paragraphs are the design. Switching pairing
  changes the body face (classic → Source Serif body; modern → Plex Sans).
  This stays inside the two-slot system (Bureau's sans-display default is the
  precedent for unconventional slot use).
- **Foundry ghost initial:** absolutely positioned 320pt glyph, tinted by
  `color: var(--c-accent)` + `opacity: 0.07` (so it follows the color variant),
  cropped by the page edge via `overflow: hidden` on the root. **Must pass
  `pnpm verify:pdf` (vector, no fallback) and an eyeball check of the export;
  fallback if the crop misbehaves in `doc.html()`: shrink/position the initial
  fully inside the margins.**
- Font-override hooks (`fontStyleFor`) on: sender name, recipient name,
  salutation, paragraph text, signature.
- Empty-field guards: `subject` empty hides the Re: row (Strata drops the Re
  cell and lets the remaining columns fill; Carbon/others omit the row);
  optional contact fields hide their separators; empty monogram/ghost hides
  the device.
- Page-break markers: `data-pdf-block` on the letterhead block, the
  date/recipient/subject front matter, the salutation, **each paragraph**, the
  closing/signature block, and Carbon's footer. (Letters are one page by
  design, but markers are mandatory on every template.)
- Presets: wrap the 2–3 largest font sizes in `calc(… * var(--s-font-scale))`;
  multiply the major vertical gaps by `var(--sp-section-scale)`.
- Carbon's pinned footer (`position: absolute; bottom`) stays — single-page
  document; verify it exports at the sheet bottom, else fall back to a tall
  static margin.

## 6. Testing & verification

- Unit/RTL: schema test, importSpec test, index test (collectText covers every
  field), derive.ts tests, per-template Preview + lazy round-trip tests
  (copied from siblings), registry test update.
- `fonts.test.ts` auto-scans the new CSS files (recursive glob).
- `pnpm build` — types + every new route generates.
- `pnpm verify:pdf` — discovers the new `/build/cover-letter/*` routes from
  the static build and forensically checks every template × pairing export
  (this is the gate for Foundry's ghost and Carbon's footer).

## Out of scope

- Matched resume + cover-letter pairs (user chose standalone designs).
- Enclosure / P.S. fields (user chose plain full anatomy).
- New form controls, multi-page letters.

## Addendum (2026-07-15): cover-letter font pairings

Shipped with its own pairing catalog after user feedback ("font variants not
working in the actual content"): with the shared `FONT_PAIRINGS`, Classic /
Editorial / Mono all map an Inter body, and a letter's body IS its content.
`CL_FONT_PAIRINGS` gives every pairing a distinct body — classic
sourceSerif/inter, editorial playfair/**lora**, modern plexSans/plexSans, mono
plexMono/**plexMono** — and `resolveVariant`/`resolveVariantFontIds` gained a
pairing-list parameter (mirroring `colors`) so previews and PDF embedding both
resolve against the template's list. A missing `salutation` field was also
added to the editor schema (new "Letter" section).
