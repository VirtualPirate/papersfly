# Invoice document type + four templates — design spec

**Date:** 2026-07-08
**Status:** Approved (design directions + architecture), ready for implementation plan
**Demos:** https://claude.ai/code/artifact/af3b543f-ff80-4af1-94dc-032d8bb57af1

## 1. Overview

Add a second document kind — **Invoice** — to the client-side builder, alongside the
existing resume. It ships with **four hand-authored templates** (`Nordic`, `Sterling`,
`Prism`, `Bureau`), each a distinct visual identity, rendered at true US-Letter size as
HTML/CSS and exported to a true-vector PDF through the same `doc.html()` path the resumes
use. There is no backend; everything runs in the browser and works offline.

The visual designs were approved from a published demo (see link above). This spec covers
the data model, the one piece of new logic invoices need (money computation), the small
generalizations that make the app document-agnostic, and the module/testing plan.

### Goals
- One `Invoice` `DocumentType<InvoiceData>` with four `Template<InvoiceData>` designs.
- Full ("rich") data model: parties, line items, discount, multiple tax lines, deposit /
  balance due, PO number, payment instructions, notes, currency.
- Correct, tested money math; templates render computed values and never calculate.
- Same end-to-end quality bar as resumes: editable form, style variants, true-vector PDF.
- AI import parity (the Import dialog works for invoices too).

### Non-goals (out of scope for this work)
- Multi-page invoices (pagination is coarse; single-page only, same as resumes).
- Line-item-level discounts or tax (discount and tax apply at the subtotal level).
- Full ISO-4217 currency UX beyond `Intl` narrow-symbol formatting (see §11 risks).
- Saving/loading invoices, numbering sequences, or any persistence.

## 2. The four approved designs

Each template renders the *same* `InvoiceData`; only the design differs. Defaults match
the demo. Production fonts are the already-bundled faces (no new fonts).

| Template | Aesthetic | Palette (default) | Type | Signature device |
|----------|-----------|-------------------|------|------------------|
| **Nordic** | Minimal / Swiss | near-white, ink, signal red | IBM Plex Sans (tight) + tabular figures | spec-sheet metadata column; **balance due large in red** |
| **Sterling** | Classic / serif | warm off-white, bottle green, gold | Playfair Display + Source Serif 4 | **engraved masthead** framed by double rules |
| **Prism** | Bold / creative | teal rail, cream, coral | IBM Plex Sans (heavy) + Inter | solid **brand rail** + oversized wordmark + **coral balance chip** |
| **Bureau** | Structured / corporate | white, slate, corporate blue, zebra | Inter + IBM Plex Mono | **boxed metadata grid** + filled totals panel + mono figures |

## 3. Data model — `src/data/invoice.ts`

Content only, no design (mirrors how `resume.ts` is authored). List items carry `id` for
stable keys and per-field font overrides.

```ts
export interface InvoiceContact {
  name: string;          // company or person
  line2: string;         // sender tagline / client "Attn: …"
  address: string[];     // address lines (edited as multiline)
  detail: string;        // small ref line — EIN / VAT / contact
}

export interface LineItem {
  id: string;
  description: string;
  detail: string;        // secondary line under the description
  quantity: number;      // numeric so amount = quantity × rate
  unit: string;          // optional display unit, e.g. "hrs" ("" ⇒ none)
  rate: number;          // unit rate
}

export interface TaxLine {
  id: string;
  label: string;         // e.g. "Sales tax (8.5%)" — display label
  rate: number;          // percent, drives the math
}

export interface InvoiceData {
  // header / meta
  title: string;         // "Invoice" — overridable ("Tax Invoice", "Receipt")
  number: string;
  issueDate: string;     // free text (matches resume's free-text dates)
  dueDate: string;
  terms: string;         // "Net 30"
  poNumber: string;      // "" ⇒ row hidden
  currency: string;      // ISO 4217 code, e.g. "USD"

  // parties
  from: InvoiceContact;
  billTo: InvoiceContact;

  // body
  items: LineItem[];

  // adjustments
  discountLabel: string;
  discountKind: "percent" | "amount";
  discountValue: number; // 0 ⇒ discount row hidden
  taxes: TaxLine[];      // [] ⇒ no tax rows

  amountPaidLabel: string;
  amountPaid: number;    // 0 ⇒ no deposit split; balance = total

  // footer
  paymentLabel: string;
  paymentLines: string[];
  notes: string;
}
```

**Sample content** (`sampleInvoice`): the demo's "Atelier Nord → Cascadia Coffee Roasters"
invoice — four line items, a returning-client 5% discount, an 8.5% sales-tax line, a
$5,000 deposit, PO number, and bank remittance details — so the default exercises every
optional field. (`quantity: 8, unit: "hrs"` reproduces the demo's "8 hrs".)

### Empty-field rules (templates apply these, mirroring resume "drop empties")
- `poNumber === ""` → hide the PO row.
- `discountValue === 0` → hide the discount row.
- `taxes.length === 0` → hide tax rows.
- `amountPaid === 0` → hide the "amount paid" row; the emphasized figure is the **total**
  (labelled "Total" / "Amount due") rather than a separate balance.
- `paymentLines.length === 0` and `notes === ""` → hide the footer blocks.
- Any blank contact line / item detail is skipped.

## 4. Money computation — `src/documents/invoice/compute.ts`

The one piece of logic the resume builder doesn't have. Isolated as a pure, tested module
so templates stay dumb (render numbers, never calculate). Line `amount = quantity × rate`.

```ts
export interface ComputedTax { id: string; label: string; amount: number }

export interface InvoiceTotals {
  lineAmounts: number[];   // parallel to items; amount = quantity × rate
  subtotal: number;        // Σ lineAmounts
  discount: number;        // resolved discount amount (≥ 0)
  taxable: number;         // max(0, subtotal − discount)
  taxes: ComputedTax[];    // each amount = taxable × rate/100
  taxTotal: number;        // Σ taxes.amount
  total: number;           // taxable + taxTotal
  amountPaid: number;      // echoes InvoiceData.amountPaid
  balanceDue: number;      // total − amountPaid
}

export function computeTotals(inv: InvoiceData): InvoiceTotals;
export function formatMoney(amount: number, currency: string): string;
```

**Rules**
- `discount`: if `discountKind === "percent"`, `subtotal × discountValue/100`; else the flat
  `discountValue`. Clamped so `taxable` never goes negative.
- `taxable = max(0, subtotal − discount)`. Taxes apply to the **discounted** subtotal.
- `formatMoney` uses `Intl.NumberFormat(undefined, { style: "currency", currency,
  currencyDisplay: "narrowSymbol" })`, falling back to a plain `"$" + fixed(2)` if the code
  is invalid. Rounding: standard 2-dp half-up via `toFixed`/`Intl`.
- All amounts are rounded for display only; intermediate sums use full precision.

## 5. Architecture changes (small, surgical)

The app is already mostly document-agnostic (`App.tsx`, the registry, and routing use
`any`/`unknown`). Four seams to open:

1. **Generalize the template types** — `src/templates/types.ts` + `lazyTemplate.ts`:
   - `Template<T = ResumeData>` with `schema: FormSchema<T>` and
     `Preview: ComponentType<{ data: T; fontOverrides?; variant? }>`.
   - `lazyTemplate<T>(meta, load)` where `meta.schema: FormSchema<T>` and
     `PreviewModule<T>`. resume call sites infer `T = ResumeData` unchanged.
   - `DocumentType<T>.templates: Template<T>[]`.

2. **Move font-coverage text collection onto the document** — `src/documents/types.ts`:
   - Add `collectText: (data: T) => string` to `DocumentType<T>`.
   - resume provides the existing `collectResumeText`; invoice provides
     `collectInvoiceText` (name, meta, both parties, item descriptions/details/units,
     tax + payment labels, notes, **and the resolved currency symbol** so an unsupported
     symbol still trips the coverage warning).
   - `App.tsx` calls `doc.collectText(data)` instead of the hardcoded resume function.
     `collectResumeText` moves to (or is re-exported from) the resume document module.

3. **Keep `.resume-page` as the capture-root class for ALL documents.** `App.tsx`
   (`querySelector(".resume-page")`) and the PDF export in `src/pdf/download.ts` locate the
   sheet by this class. This path is fragile and dev-environment-sensitive (the disabled
   dev-toolbar gotcha). **Decision: reuse `.resume-page` as a generic page-root marker** —
   invoice template roots carry `className="resume-page"`. Renaming to `.doc-page` would
   touch the fragile export path plus five working resume templates for no functional gain;
   rejected. (A comment at each usage will note the name is historical/generic.)

4. **Extend the import spec with a numeric node** — `src/import/spec.ts`,
   `buildPrompt.ts`, `validate.ts`:
   - Add `{ type: "number"; required? }` to `ImportNode` and a `num()` helper.
   - `buildPrompt.ts` renders a numeric example; `validate.ts` accepts `typeof === "number"`
     (and coerces numeric strings, rejecting `NaN`).
   - Required so `InvoiceData`'s numeric fields survive AI import; resume import is
     unaffected (it uses no numbers).

## 6. Module layout

```
src/data/invoice.ts                         InvoiceData types + sampleInvoice
src/documents/invoice/
  index.ts                                  DocumentType<InvoiceData> (id "invoice", collectText, importSpec, templates)
  schema.ts                                 builder<InvoiceData>() form schema
  importSpec.ts                             ImportSpec mirroring InvoiceData (uses num())
  compute.ts                                computeTotals() + formatMoney()
  compute.test.ts                           math coverage
  schema.test.tsx                           schema builds against InvoiceData
  importSpec.test.ts                        spec ↔ data shape parity
src/templates/invoice/
  nordic/   { index.ts, NordicPreview.tsx, nordic.css, *.test.tsx }
  sterling/ { index.ts, SterlingPreview.tsx, sterling.css, *.test.tsx }
  prism/    { index.ts, PrismPreview.tsx, prism.css, *.test.tsx }
  bureau/   { index.ts, BureauPreview.tsx, bureau.css, *.test.tsx }
```

**Edits to existing files:**
- `src/documents/registry.ts` — append `invoiceDocument` to `documents`.
- `src/templates/types.ts`, `src/templates/lazyTemplate.ts` — generic `T`.
- `src/documents/types.ts` — add `collectText`.
- `src/documents/resume/index.ts` — provide `collectText` (resume).
- `src/App.tsx` — call `doc.collectText(data)`.
- `src/import/spec.ts`, `src/import/buildPrompt.ts`, `src/import/validate.ts` — `num()` node.
- `src/components/create/CreateGallery.tsx` — remove `"Invoice"` from `COMING_SOON_TYPES`
  (it becomes a real, selectable document).
- `src/fonts/coverage.ts` — keeps the document-agnostic `unsupportedChars`; the
  resume-specific `collectResumeText` moves out to the resume document module (so
  `coverage.ts` no longer imports `ResumeData`). `collectInvoiceText` lives in the invoice
  module. Each document wires its collector into `DocumentType.collectText`.

Routing (`/build/invoice/<template>`) and the `/create` gallery require **no structural
change** — `buildBuilderPaths` and `CreateGallery` already iterate `documents`.

## 7. Form schema outline (`schema.ts`)

`builder<InvoiceData>()` producing these sections (the editor is generated for free):

- **Details** — `title`, `number`, row(`issueDate`, `dueDate`), row(`terms`, `poNumber`),
  `currency`.
- **From** — `group("from")`: `name`, `line2`, `lines(address)`, `detail`.
- **Bill to** — `group("billTo")`: same shape.
- **Line items** — `list("items")`: `description`, `detail`, row(`quantity`, `unit`, `rate`).
- **Adjustments** — `discountLabel`, row(`discountKind`, `discountValue`),
  `list("taxes")`: `label`, `rate`; then row(`amountPaidLabel`, `amountPaid`).
- **Payment** — `paymentLabel`, `lines(paymentLines)`, `textarea(notes)`.

> Note: `discountKind` is a two-value choice ("percent"/"amount"). The current
> `FieldSpec` set is text/textarea/stringList. Simplest path: represent it as a text field
> constrained by convention, **or** add a small `select` control to the schema. Decide in
> the plan; a `select` control is the cleaner long-term choice and is a minor addition.
> Numeric fields use the existing text control; the schema form stores strings, so the
> data layer coerces `quantity`/`rate`/`discountValue`/tax `rate` to numbers on change
> (a coercion helper, kept next to `update.ts`).

## 8. Import spec (`importSpec.ts`)

Mirrors `InvoiceData` minus `id`s, using `str`/`strings`/`obj`/`list` plus the new
`num`. Numeric fields (`quantity`, `rate`, `discountValue`, tax `rate`, `amountPaid`) use
`num()`. Enables the existing Import dialog for invoices with no dialog changes.

## 9. Variants

Each template defines its **own curated `variants`** (`TemplateVariants`), defaulting to the
demo look. **Font pairings + spacing + size presets are reused as-is** (universally safe).
For color, each template exposes a few accents that suit it and wires them through its own
CSS custom properties — because Prism and Bureau use *two* signature colors, the resume's
single-`--c-accent` model doesn't map cleanly:

- Nordic — red / cobalt / ink
- Sterling — bottle green / burgundy / navy
- Prism — teal / plum / rust (rail color)
- Bureau — corporate blue / slate / teal (accent + panel)

The default variant of each template reproduces the approved demo exactly. Alternate
accents are a bonus, driven entirely by the template's own CSS vars.

## 10. Rendering invariants (every template must honor)

- Root element: `<div className="resume-page" style={themeCssVars(resolveVariant(variant))}>`.
- Author all geometry in **points (pt)** via theme CSS vars so preview and PDF match true
  physical size. Reuse `--page-w`/`--page-h`/`--margin-*` and font-scale vars from
  `theme.ts`; template-specific measurements live in the template's own CSS.
- Per-field font overrides via `fontStyleFor(fontOverrides, joinPath(...))`, same as resume
  templates, so the Style panel's per-field font control works.
- No raster images (keeps the PDF true-vector). Logos are text/monogram placeholders.
- Currency/accented glyphs must fall inside the embedded font subset (coverage.ts ranges);
  `$ € £ ¥` are covered — exotic symbols (₹, ₩) will trip the coverage warning by design.

## 11. Testing & verification

**Unit (vitest):**
- `compute.test.ts` — subtotal; percent vs. flat discount; discount clamp (never negative
  taxable); single + multiple taxes on the discounted base; total; deposit → balance;
  all-optional-empty invoice (no discount/tax/deposit); `formatMoney` for USD/EUR + invalid
  code fallback.
- `schema.test.tsx` — schema builds and keys type-check against `InvoiceData`.
- `importSpec.test.ts` — spec shape matches `InvoiceData` (incl. numeric nodes); round-trips
  `sampleInvoice` through strip-ids.
- Per-template `*.test.tsx` — renders `.resume-page`; shows the balance figure; **hides**
  discount/tax/PO/deposit rows when empty; renders multi-tax.
- `src/import/validate.test.ts` — extend for the numeric node (accept number, coerce numeric
  string, reject `NaN`).
- Registry/routing — invoice document registered; `buildBuilderPaths` emits four
  `/build/invoice/*` params.

**Browser + PDF (per the browser-verification-harness note; no Node verify script):**
- `pnpm build && pnpm preview` (source of truth), drive each `/build/invoice/<template>`
  route with playwright-core + system Chrome. Assert `.resume-page` present, totals correct,
  mobile Edit/Preview toggle works, no horizontal overflow.
- Download a PDF from each template and verify vector output: `pdffonts` (embedded fonts),
  `pdftotext` (selectable text incl. the balance figure), `node scripts/inspect-pdf.mjs`
  (VECTOR verdict, zero `/Image`).

**Type + lint:** `pnpm build` runs `astro check`.

## 12. Risks, decisions & open questions

- **`.resume-page` name kept (decided).** Reused as a generic page-root marker to avoid
  touching the fragile PDF path; documented at each usage.
- **Money computed, not stored (decided).** Dedicated tested module; templates never
  calculate.
- **Numeric import node (decided).** Extends `ImportSpec`; needed for numeric fields.
- **`discountKind` control** — add a `select` control to the schema vs. convention-only
  text field. Lean `select`; finalize in the plan.
- **Numeric coercion at the form boundary** — the schema form is string-based; a small
  coercion step converts numeric fields on change. Kept beside `update.ts`.
- **Currency** — `Intl` narrow-symbol formatting only; no currency picker beyond a free
  ISO-code field in v1. Non-subset symbols surface via the existing coverage warning.
- **Pagination** — single-page only, same limitation as resumes; long item lists may spill.

## 13. Out of scope
Multi-page invoices, per-line tax/discount, recurring/numbered sequences, persistence,
export formats other than PDF, and any server component.
