# Invoice Document Type + Four Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Invoice" document type to the client-side builder with four hand-authored templates (Nordic, Sterling, Prism, Bureau), each exported as a true-vector PDF.

**Architecture:** Invoices reuse the résumé pipeline (schema-driven editor → live HTML/CSS preview → `doc.html()` vector PDF). A new `InvoiceData` model, a pure `computeTotals`/`formatMoney` module (the only new logic), and four small generalizations that make the app document-agnostic: a generic `Template<T>`, a `DocumentType.collectText` hook, a numeric import-spec node, and `number`/`select` form controls. Each template renders a root `.resume-page` (the historical, now-generic PDF capture-root class).

**Tech Stack:** Astro + React (browser-only islands), TypeScript, vitest + @testing-library/react, jsPDF `doc.html()`, pnpm, vite@8, Tailwind + shadcn/ui.

**Design reference (approved):** `docs/superpowers/plans/assets/invoice-demos-reference.html` — the four sheets exactly as approved. Open it in a browser while building the templates; it is the source of truth for markup structure, palette, and layout.
**Spec:** `docs/superpowers/specs/2026-07-08-invoice-templates-design.md`.

## Global Constraints

- **Commits: the USER commits, not the agent.** End every task at a green test run; do **not** run `git commit`/`git add`. Leave the working tree for the user to review.
- **Geometry in PostScript points (pt).** The page is 612pt × 792pt (US Letter). Author every template length in `pt` (via theme CSS vars where available) so the on-screen preview and the PDF share true physical size. Never introduce raster images — logos are text/monograms — so the PDF stays true-vector.
- **Capture-root class is `.resume-page`.** `App.tsx` and `src/pdf/download.ts` locate the sheet with `querySelector(".resume-page")`. Every template's root element must carry `className="resume-page …"`. Do **not** rename this class.
- **The Astro dev toolbar stays disabled** (`astro.config.mjs`) — it corrupts PDF export. `pnpm build && pnpm preview` is the source of truth for PDF output.
- **vite stays on vite@8.** Never re-pin vite@5 (breaks `@tailwindcss/vite`).
- **Font subset:** the embedded fonts cover Latin + `$ € £ ¥`. Exotic currency symbols (₹, ₩) will trip the existing coverage warning — that is expected, not a bug.
- **Package manager is pnpm.** Run a single test file with `pnpm exec vitest run <path>`.
- **Money is computed, never stored.** Templates call `computeTotals`/`formatMoney`; they never do arithmetic inline.

---

## File Structure

**New files**
- `src/data/invoice.ts` — `InvoiceData` types + `sampleInvoice`.
- `src/documents/invoice/compute.ts` — `computeTotals`, `formatMoney`.
- `src/documents/invoice/schema.ts` — `invoiceSchema`, `makeBlankItem`, `makeBlankTax`.
- `src/documents/invoice/importSpec.ts` — `invoiceImportSpec`.
- `src/documents/invoice/index.ts` — `invoiceDocument` + `collectInvoiceText`.
- `src/documents/invoice/*.test.ts(x)` — compute / schema / importSpec tests.
- `src/templates/invoice/{nordic,sterling,prism,bureau}/` — `index.ts`, `<Name>Preview.tsx`, `<name>.css`, `<Name>Preview.test.tsx`, `index.test.tsx` per template.
- `src/templates/invoice/variants.ts` — per-template invoice color schemes.

**Modified files**
- `src/templates/types.ts` — make `Template<T>` generic.
- `src/templates/lazyTemplate.ts` — make `lazyTemplate<T>` generic.
- `src/documents/types.ts` — add `collectText` to `DocumentType<T>`.
- `src/documents/resume/index.ts` — add `collectText` (owns `collectResumeText`).
- `src/fonts/coverage.ts` — remove `collectResumeText` (keep `unsupportedChars`).
- `src/App.tsx` — call `doc.collectText(data)`.
- `src/forms/schema.ts` — add `number` + `select` field specs & builder methods.
- `src/forms/SchemaForm.tsx` — render `number` + `select` controls.
- `src/import/spec.ts` — add `number` node + `num()` helper.
- `src/import/buildPrompt.ts` — outline the `number` node.
- `src/import/validate.ts` — validate the `number` node.
- `src/documents/registry.ts` — register `invoiceDocument`.
- `src/components/create/CreateGallery.tsx` — drop `"Invoice"` from `COMING_SOON_TYPES`.

---

## Task 1: Invoice data model

**Files:**
- Create: `src/data/invoice.ts`
- Test: `src/data/invoice.test.ts`

**Interfaces:**
- Produces: `InvoiceContact`, `LineItem`, `TaxLine`, `InvoiceData` interfaces; `sampleInvoice: InvoiceData`.

- [ ] **Step 1: Write the failing test**

`src/data/invoice.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sampleInvoice } from "./invoice";

describe("sampleInvoice", () => {
  it("is a fully populated invoice exercising every optional field", () => {
    expect(sampleInvoice.currency).toBe("USD");
    expect(sampleInvoice.items).toHaveLength(4);
    expect(sampleInvoice.taxes.length).toBeGreaterThan(0);
    expect(sampleInvoice.discountValue).toBeGreaterThan(0);
    expect(sampleInvoice.amountPaid).toBeGreaterThan(0);
    expect(sampleInvoice.from.name).toBe("Atelier Nord");
    expect(sampleInvoice.billTo.name).toBe("Cascadia Coffee Roasters");
  });

  it("uses numeric quantity/rate on every line and numeric tax rate", () => {
    for (const it of sampleInvoice.items) {
      expect(typeof it.quantity).toBe("number");
      expect(typeof it.rate).toBe("number");
    }
    for (const t of sampleInvoice.taxes) expect(typeof t.rate).toBe("number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/data/invoice.test.ts`
Expected: FAIL — `Cannot find module './invoice'`.

- [ ] **Step 3: Write the implementation**

`src/data/invoice.ts`:
```ts
/**
 * The invoice CONTENT, fully decoupled from the DESIGN (mirrors data/resume.ts).
 * Money is never stored here — computeTotals() derives every amount from
 * quantity × rate. Templates render computed values and hide empty optional
 * fields (poNumber, discount, taxes, amountPaid, payment, notes).
 */
export interface InvoiceContact {
  name: string;
  line2: string;        // sender tagline / client "Attn: …"
  address: string[];    // address lines
  detail: string;       // small ref line — EIN / VAT / contact
}

export interface LineItem {
  id: string;
  description: string;
  detail: string;       // secondary line under the description
  quantity: number;
  unit: string;         // display unit, e.g. "hrs" ("" ⇒ none)
  rate: number;
}

export interface TaxLine {
  id: string;
  label: string;        // e.g. "Sales tax (8.5%)"
  rate: number;         // percent
}

export interface InvoiceData {
  title: string;        // "Invoice" — overridable
  number: string;
  issueDate: string;
  dueDate: string;
  terms: string;
  poNumber: string;     // "" ⇒ hidden
  currency: string;     // ISO 4217 code, e.g. "USD"

  from: InvoiceContact;
  billTo: InvoiceContact;

  items: LineItem[];

  discountLabel: string;
  discountKind: "percent" | "amount";
  discountValue: number; // 0 ⇒ hidden
  taxes: TaxLine[];      // [] ⇒ hidden

  amountPaidLabel: string;
  amountPaid: number;    // 0 ⇒ balance = total

  paymentLabel: string;
  paymentLines: string[];
  notes: string;
}

export const sampleInvoice: InvoiceData = {
  title: "Invoice",
  number: "INV-2026-0114",
  issueDate: "Jul 8, 2026",
  dueDate: "Aug 7, 2026",
  terms: "Net 30",
  poNumber: "PO-4471",
  currency: "USD",
  from: {
    name: "Atelier Nord",
    line2: "Design & Brand Studio",
    address: ["42 Warehouse Lane, Studio 3", "Portland, OR 97209", "hello@ateliernord.co", "(503) 555-0172"],
    detail: "EIN 47-2938471",
  },
  billTo: {
    name: "Cascadia Coffee Roasters",
    line2: "Attn: Mara Whitfield",
    address: ["1180 SE Belmont Street", "Portland, OR 97214"],
    detail: "",
  },
  items: [
    { id: "li-1", description: "Brand identity system", detail: "Logo suite, type & color palette", quantity: 1, unit: "", rate: 6800 },
    { id: "li-2", description: "Packaging design", detail: "Three retail SKUs", quantity: 3, unit: "", rate: 1450 },
    { id: "li-3", description: "Website design", detail: "Six responsive pages", quantity: 1, unit: "", rate: 5200 },
    { id: "li-4", description: "Photography art direction", detail: "On-site, half day", quantity: 8, unit: "hrs", rate: 145 },
  ],
  discountLabel: "Returning client (5%)",
  discountKind: "percent",
  discountValue: 5,
  taxes: [{ id: "tx-1", label: "Sales tax (8.5%)", rate: 8.5 }],
  amountPaidLabel: "Deposit received",
  amountPaid: 5000,
  paymentLabel: "Payment",
  paymentLines: ["Cascade Credit Union", "Routing 123 456 789", "Account 000 112 223", "ateliernord.co/pay"],
  notes: "Thank you for your business. Balances unpaid after the due date accrue interest at 1.5% per month.",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/data/invoice.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Checkpoint** — tests green. Leave the working tree for the user to commit.

---

## Task 2: Money computation module

**Files:**
- Create: `src/documents/invoice/compute.ts`
- Test: `src/documents/invoice/compute.test.ts`

**Interfaces:**
- Consumes: `InvoiceData`, `sampleInvoice` (Task 1).
- Produces:
  - `interface ComputedTax { id: string; label: string; amount: number }`
  - `interface InvoiceTotals { lineAmounts: number[]; subtotal: number; discount: number; taxable: number; taxes: ComputedTax[]; taxTotal: number; total: number; amountPaid: number; balanceDue: number }`
  - `function computeTotals(inv: InvoiceData): InvoiceTotals`
  - `function formatMoney(amount: number, currency: string): string`

- [ ] **Step 1: Write the failing test**

`src/documents/invoice/compute.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeTotals, formatMoney } from "./compute";
import { sampleInvoice } from "../../data/invoice";
import type { InvoiceData } from "../../data/invoice";

describe("computeTotals", () => {
  it("computes the sample invoice end to end", () => {
    const t = computeTotals(sampleInvoice);
    expect(t.lineAmounts).toEqual([6800, 4350, 5200, 1160]);
    expect(t.subtotal).toBe(17510);
    expect(t.discount).toBe(875.5);          // 5% of 17510
    expect(t.taxable).toBe(16634.5);
    expect(t.taxes[0].amount).toBe(1413.93);  // 8.5% of 16634.5, rounded
    expect(t.taxTotal).toBe(1413.93);
    expect(t.total).toBe(18048.43);
    expect(t.amountPaid).toBe(5000);
    expect(t.balanceDue).toBe(13048.43);
  });

  it("supports a flat-amount discount", () => {
    const inv: InvoiceData = { ...sampleInvoice, discountKind: "amount", discountValue: 1000, taxes: [] };
    const t = computeTotals(inv);
    expect(t.discount).toBe(1000);
    expect(t.taxable).toBe(16510);
    expect(t.total).toBe(16510);
  });

  it("sums multiple tax lines on the discounted base", () => {
    const inv: InvoiceData = {
      ...sampleInvoice, discountValue: 0,
      taxes: [{ id: "a", label: "GST 5%", rate: 5 }, { id: "b", label: "PST 7%", rate: 7 }],
    };
    const t = computeTotals(inv);
    expect(t.taxable).toBe(17510);
    expect(t.taxes.map((x) => x.amount)).toEqual([875.5, 1225.7]);
    expect(t.taxTotal).toBe(2101.2);
    expect(t.total).toBe(19611.2);
  });

  it("never lets a discount push the taxable base below zero", () => {
    const inv: InvoiceData = { ...sampleInvoice, discountKind: "amount", discountValue: 999999, taxes: [] };
    const t = computeTotals(inv);
    expect(t.taxable).toBe(0);
    expect(t.total).toBe(0);
  });

  it("treats amountPaid 0 as balance = total", () => {
    const inv: InvoiceData = { ...sampleInvoice, amountPaid: 0 };
    const t = computeTotals(inv);
    expect(t.balanceDue).toBe(t.total);
  });
});

describe("formatMoney", () => {
  it("formats known currencies with a narrow symbol", () => {
    expect(formatMoney(1413.93, "USD")).toBe("$1,413.93");
    expect(formatMoney(1000, "EUR")).toBe("€1,000.00");
  });
  it("falls back to a $-prefixed number for an invalid currency code", () => {
    expect(formatMoney(1000, "NOPE")).toMatch(/^\$1,000\.00$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/documents/invoice/compute.test.ts`
Expected: FAIL — `Cannot find module './compute'`.

- [ ] **Step 3: Write the implementation**

`src/documents/invoice/compute.ts`:
```ts
import type { InvoiceData } from "../../data/invoice";

export interface ComputedTax {
  id: string;
  label: string;
  amount: number;
}

export interface InvoiceTotals {
  lineAmounts: number[];
  subtotal: number;
  discount: number;
  taxable: number;
  taxes: ComputedTax[];
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

/** Round to whole cents, avoiding binary-float drift (e.g. 1413.9325 → 1413.93). */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Derive every monetary figure from the raw invoice. Line amount = quantity ×
 * rate; discount applies at the subtotal; taxes apply to the discounted base;
 * balance = total − amountPaid. The taxable base is clamped at 0.
 */
export function computeTotals(inv: InvoiceData): InvoiceTotals {
  const lineAmounts = inv.items.map((it) => r2(it.quantity * it.rate));
  const subtotal = r2(lineAmounts.reduce((s, n) => s + n, 0));

  const rawDiscount = inv.discountKind === "percent"
    ? subtotal * (inv.discountValue / 100)
    : inv.discountValue;
  const discount = r2(Math.max(0, rawDiscount));
  const taxable = r2(Math.max(0, subtotal - discount));

  const taxes: ComputedTax[] = inv.taxes.map((t) => ({
    id: t.id,
    label: t.label,
    amount: r2(taxable * (t.rate / 100)),
  }));
  const taxTotal = r2(taxes.reduce((s, t) => s + t.amount, 0));
  const total = r2(taxable + taxTotal);
  const amountPaid = r2(inv.amountPaid);
  const balanceDue = r2(total - amountPaid);

  return { lineAmounts, subtotal, discount, taxable, taxes, taxTotal, total, amountPaid, balanceDue };
}

/**
 * Format an amount for the given ISO 4217 currency using a narrow symbol and
 * fixed en-US grouping (deterministic across environments). Falls back to a
 * "$"-prefixed grouped number when the code is not valid.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/documents/invoice/compute.test.ts`
Expected: PASS (7 tests). If `formatMoney(1000,"EUR")` differs by symbol placement in your Node ICU build, adjust the expectation to the actual narrow-symbol output — the USD case is the load-bearing one.

- [ ] **Step 5: Checkpoint** — tests green. Leave for the user to commit.

---

## Task 3: Numeric import-spec node

**Files:**
- Modify: `src/import/spec.ts`, `src/import/buildPrompt.ts`, `src/import/validate.ts`
- Test: `src/import/validate.test.ts` (extend), `src/import/spec.test.ts` (extend if it asserts node kinds)

**Interfaces:**
- Produces: `num(o?: { required?: boolean }): ImportNode` and `{ type: "number"; required?: boolean }` added to `ImportNode`. `validateAgainstSpec` accepts numbers (coercing numeric strings, rejecting NaN); `buildImportPrompt` outlines `"number"`.

- [ ] **Step 1: Write the failing test**

Append to `src/import/validate.test.ts`:
```ts
import { num } from "./spec"; // add to existing imports if not present

describe("numeric import node", () => {
  const spec = { qty: num(), rate: num() };

  it("accepts real numbers", () => {
    const res = validateAgainstSpec(spec, { qty: 3, rate: 12.5 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toEqual({ qty: 3, rate: 12.5 });
  });

  it("coerces numeric strings the AI may emit", () => {
    const res = validateAgainstSpec(spec, { qty: "3", rate: "12.50" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toEqual({ qty: 3, rate: 12.5 });
  });

  it("rejects non-numeric text", () => {
    const res = validateAgainstSpec(spec, { qty: "lots", rate: 1 });
    expect(res.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/import/validate.test.ts`
Expected: FAIL — `num` is not exported / `"number"` unhandled.

- [ ] **Step 3: Add the node type + helper** in `src/import/spec.ts`

Change the `ImportNode` union (add the number member) and add `num`:
```ts
export type ImportNode =
  | { type: "string"; required?: boolean }
  | { type: "strings"; required?: boolean }
  | { type: "number"; required?: boolean } // a single number
  | { type: "object"; required?: boolean; fields: ImportSpec }
  | { type: "list"; required?: boolean; item: ImportSpec };
```
Add next to the other helpers:
```ts
export const num = (o?: { required?: boolean }): ImportNode => ({ type: "number", ...o });
```

- [ ] **Step 4: Handle it in the prompt outline** in `src/import/buildPrompt.ts`

In `outlineNode`, add a case before the `object` case:
```ts
    case "number": return "number";
```

- [ ] **Step 5: Validate it** in `src/import/validate.ts`

Add a `case "number"` to `checkNode` (after the `strings` case):
```ts
    case "number": {
      if (typeof value === "number" && !Number.isNaN(value)) return value;
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
      }
      errors.push({ path, message: `expected a number, got ${typeName(value)}` });
      return 0;
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/import/validate.test.ts src/import/spec.test.ts`
Expected: PASS (existing tests still green + the 3 new ones).

- [ ] **Step 7: Checkpoint** — tests green. Leave for the user to commit.

---

## Task 4: Generalize templates + add `collectText` to documents

**Files:**
- Modify: `src/templates/types.ts`, `src/templates/lazyTemplate.ts`, `src/documents/types.ts`, `src/documents/resume/index.ts`, `src/fonts/coverage.ts`, `src/App.tsx`
- Test: `src/documents/resume/index.test.ts` (create)

**Interfaces:**
- Produces: `Template<T = ResumeData>` (schema/Preview/preload parameterized by `T`); `lazyTemplate<T = ResumeData>(meta, load): Template<T>`; `DocumentType<T>.collectText: (data: T) => string`; `resumeDocument.collectText`; `collectResumeText` re-homed to `src/documents/resume/index.ts`.
- Consumes: existing `ResumeData`, `resumeDocument`.

- [ ] **Step 1: Write the failing test**

`src/documents/resume/index.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resumeDocument } from "./index";
import { sampleResume } from "../../data/resume";

describe("resumeDocument.collectText", () => {
  it("returns one blob containing the name, a company and a skill", () => {
    const text = resumeDocument.collectText(sampleResume);
    expect(text).toContain("Jordan Avery Chen");
    expect(text).toContain("Northwind Labs");
    expect(text).toContain("TypeScript");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/documents/resume/index.test.ts`
Expected: FAIL — `collectText is not a function`.

- [ ] **Step 3: Generalize the template types** in `src/templates/types.ts`

Change the `Template` interface to be generic (leave `TemplateVariants` as-is):
```ts
export interface Template<T = ResumeData> {
  id: string;
  name: string;
  description?: string;
  schema: FormSchema<T>;
  variants: TemplateVariants;
  Preview: ComponentType<{ data: T; fontOverrides?: FontOverrides; variant?: Variant }>;
  preload: () => Promise<ComponentType<{ data: T; fontOverrides?: FontOverrides; variant?: Variant }>>;
}
```

- [ ] **Step 4: Generalize `lazyTemplate`** in `src/templates/lazyTemplate.ts`
```ts
type PreviewModule<T> = {
  default: ComponentType<{ data: T; fontOverrides?: FontOverrides; variant?: Variant }>;
};

export function lazyTemplate<T = ResumeData>(
  meta: {
    id: string;
    name: string;
    description?: string;
    schema: FormSchema<T>;
    variants: TemplateVariants;
  },
  load: () => Promise<PreviewModule<T>>,
): Template<T> {
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
(The existing `import type { ResumeData }` stays as the default type argument. Résumé call sites are unaffected — `T` infers `ResumeData` from their `resumeSchema`.)

- [ ] **Step 5: Add `collectText` to the document interface** in `src/documents/types.ts`

Add to `DocumentType<T>` and update the templates field type:
```ts
export interface DocumentType<T> {
  id: string;
  name: string;
  defaultData: T;
  importSpec: ImportSpec;
  templates: Template<T>[];
  /** Flatten every user-entered string into one blob for the font-coverage scan. */
  collectText: (data: T) => string;
}
```
Add `import type { Template } from "../templates/types";` if not already present (it imports `Template` already).

- [ ] **Step 6: Re-home `collectResumeText`** — remove it from `src/fonts/coverage.ts` (delete the whole `collectResumeText` function and its `ResumeData` import; keep `unsupportedChars` and `SUPPORTED_RANGES`). Add it to `src/documents/resume/index.ts` and wire `collectText`:
```ts
import type { ResumeData } from "../../data/resume";
// … existing imports …

/** Flatten every user-entered résumé string into one blob for coverage scanning. */
export function collectResumeText(data: ResumeData): string {
  const parts: string[] = [data.name, data.headline, data.summary, ...Object.values(data.contact)];
  for (const e of data.experience) parts.push(e.role, e.company, e.location, ...e.bullets);
  for (const e of data.education) parts.push(e.institution, e.degree, e.location, e.detail);
  for (const s of data.skills) parts.push(s.label, ...s.items);
  return parts.join(" ");
}

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "Résumé",
  defaultData: sampleResume,
  importSpec: resumeImportSpec,
  templates: [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate],
  collectText: collectResumeText,
};
```

- [ ] **Step 7: Update `App.tsx`** — change the import and the call site.

Change the coverage import (line ~13) from:
```ts
import { collectResumeText, unsupportedChars } from "./fonts/coverage";
```
to:
```ts
import { unsupportedChars } from "./fonts/coverage";
```
Change the `unsupported` memo (line ~66) from `collectResumeText(data)` to `doc.collectText(data)`:
```ts
  const unsupported = useMemo(() => unsupportedChars(doc.collectText(data)), [doc, data]);
```

- [ ] **Step 8: Run the affected suites**

Run: `pnpm exec vitest run src/documents src/templates src/fonts`
Expected: PASS — the new `collectText` test plus all existing document/template/coverage tests. (If `coverage.test.ts` imported `collectResumeText`, update its import to `../documents/resume` and re-run.)

- [ ] **Step 9: Type-check**

Run: `pnpm build`
Expected: `astro check` passes with 0 errors (confirms the generic change compiles across all résumé templates).

- [ ] **Step 10: Checkpoint** — green. Leave for the user to commit.

---

## Task 5: `number` and `select` form controls

**Files:**
- Modify: `src/forms/schema.ts`, `src/forms/SchemaForm.tsx`
- Test: `src/forms/SchemaForm.controls.test.tsx` (create)

**Interfaces:**
- Produces: two new `FieldSpec` members `{ control: "number"; placeholder?; step?; min? }` and `{ control: "select"; options: { value: string; label: string }[] }`; builder methods `number(key, label, opts?)` and `select(key, label, options)`. The `number` control emits a `number` (empty ⇒ 0, NaN ⇒ previous value); `select` emits the chosen string.

- [ ] **Step 1: Write the failing test**

`src/forms/SchemaForm.controls.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "./SchemaForm";
import { builder, type FormSchema } from "./schema";

interface Row { amount: number; kind: "percent" | "amount" }
const b = builder<Row>();
const schema: FormSchema<Row> = [
  b.section("Row", [
    b.number("amount", "Amount"),
    b.select("kind", "Kind", [
      { value: "percent", label: "Percent (%)" },
      { value: "amount", label: "Fixed amount" },
    ]),
  ]),
];

describe("number + select controls", () => {
  it("number control emits a numeric value", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={{ amount: 0, kind: "percent" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42.5" } });
    expect(onChange).toHaveBeenCalledWith({ amount: 42.5, kind: "percent" });
  });

  it("select control emits the chosen option value", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={{ amount: 0, kind: "percent" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Kind"), { target: { value: "amount" } });
    expect(onChange).toHaveBeenCalledWith({ amount: 0, kind: "amount" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/forms/SchemaForm.controls.test.tsx`
Expected: FAIL — `b.number is not a function`.

- [ ] **Step 3: Extend `FieldSpec` and the builder** in `src/forms/schema.ts`

Extend the `FieldSpec` union:
```ts
export type FieldSpec =
  | { control: "text"; placeholder?: string }
  | { control: "textarea"; rows?: number }
  | { control: "stringList"; separator: string; multiline: boolean; rows?: number }
  | { control: "number"; placeholder?: string; step?: number; min?: number }
  | { control: "select"; options: { value: string; label: string }[] };
```
Add to the `Builder<S>` interface:
```ts
  number(key: Key<S>, label: string, opts?: { placeholder?: string; step?: number; min?: number }): LeafField;
  select(key: Key<S>, label: string, options: { value: string; label: string }[]): LeafField;
```
Add to the builder implementation object in `builder<T>()` (alongside `field`/`textarea`):
```ts
    number: (key: string, label: string, opts?: { placeholder?: string; step?: number; min?: number }) => ({
      kind: "field",
      key,
      label,
      spec: { control: "number", ...opts },
    }),
    select: (key: string, label: string, options: { value: string; label: string }[]) => ({
      kind: "field",
      key,
      label,
      spec: { control: "select", options },
    }),
```

- [ ] **Step 4: Render the controls** in `src/forms/SchemaForm.tsx`

In `Control`, add these two branches before the final `return <Input …>`:
```tsx
  if (spec.control === "number") {
    return (
      <Input
        type="number"
        inputMode="decimal"
        step={spec.step ?? "any"}
        min={spec.min}
        className={className}
        placeholder={spec.placeholder}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(0);
          const n = Number(raw);
          onChange(Number.isNaN(n) ? (typeof value === "number" ? value : 0) : n);
        }}
      />
    );
  }
  if (spec.control === "select") {
    return (
      <select
        className={
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm " +
          "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
          (className ?? "")
        }
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {spec.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/forms/SchemaForm.controls.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Regression + type-check**

Run: `pnpm exec vitest run src/forms && pnpm build`
Expected: existing form tests pass; `astro check` clean.

- [ ] **Step 7: Checkpoint** — green. Leave for the user to commit.

---

## Task 6: Invoice form schema

**Files:**
- Create: `src/documents/invoice/schema.ts`
- Test: `src/documents/invoice/schema.test.tsx`

**Interfaces:**
- Consumes: `builder`, `FormSchema` (Task 5 controls), `InvoiceData`, `LineItem`, `TaxLine` (Task 1).
- Produces: `invoiceSchema: FormSchema<InvoiceData>`; `makeBlankItem(): Omit<LineItem, "id">`; `makeBlankTax(): Omit<TaxLine, "id">`.

- [ ] **Step 1: Write the failing test**

`src/documents/invoice/schema.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "../../forms/SchemaForm";
import { invoiceSchema, makeBlankItem, makeBlankTax } from "./schema";
import { sampleInvoice } from "../../data/invoice";

function expandAll() {
  for (const name of ["Parties", "Line items", "Adjustments", "Payment"]) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
}

describe("invoiceSchema", () => {
  it("renders every section and key label", () => {
    render(<SchemaForm schema={invoiceSchema} data={sampleInvoice} onChange={() => {}} />);
    for (const heading of ["Details", "Parties", "Line items", "Adjustments", "Payment"]) {
      expect(screen.getByRole("button", { name: heading })).toBeInTheDocument();
    }
    expandAll();
    for (const label of ["Invoice number", "Currency", "Description", "Rate", "Discount type", "Notes"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("blank-item factories return the documented defaults", () => {
    expect(makeBlankItem()).toEqual({ description: "Item", detail: "", quantity: 1, unit: "", rate: 0 });
    expect(makeBlankTax()).toEqual({ label: "Tax", rate: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/documents/invoice/schema.test.tsx`
Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 3: Write the schema**

`src/documents/invoice/schema.ts`:
```ts
import { builder, type FormSchema } from "../../forms/schema";
import type { InvoiceData, LineItem, TaxLine } from "../../data/invoice";

export const makeBlankItem = (): Omit<LineItem, "id"> => ({
  description: "Item",
  detail: "",
  quantity: 1,
  unit: "",
  rate: 0,
});

export const makeBlankTax = (): Omit<TaxLine, "id"> => ({
  label: "Tax",
  rate: 0,
});

const b = builder<InvoiceData>();

export const invoiceSchema: FormSchema<InvoiceData> = [
  b.section("Details", [
    b.field("title", "Document title", { control: "text", placeholder: "Invoice" }),
    b.row(b.field("number", "Invoice number"), b.field("currency", "Currency (ISO code)")),
    b.row(b.field("issueDate", "Issue date"), b.field("dueDate", "Due date")),
    b.row(b.field("terms", "Terms"), b.field("poNumber", "P.O. number")),
  ]),
  b.section("Parties", [
    b.group("from", (f) => [
      f.field("name", "Your name / business"),
      f.field("line2", "Tagline"),
      f.lines("address", "Address (one line each)", { rows: 3 }),
      f.field("detail", "Tax ID / reference"),
    ]),
    b.group("billTo", (c) => [
      c.field("name", "Client name"),
      c.field("line2", "Attention"),
      c.lines("address", "Address (one line each)", { rows: 3 }),
      c.field("detail", "Client reference"),
    ]),
  ]),
  b.list("items", "Line items", makeBlankItem, (it) => [
    it.field("description", "Description"),
    it.field("detail", "Detail"),
    it.row(it.number("quantity", "Qty"), it.field("unit", "Unit"), it.number("rate", "Rate")),
  ]),
  b.section("Adjustments", [
    b.field("discountLabel", "Discount label"),
    b.row(
      b.select("discountKind", "Discount type", [
        { value: "percent", label: "Percent (%)" },
        { value: "amount", label: "Fixed amount" },
      ]),
      b.number("discountValue", "Discount value"),
    ),
    b.row(b.field("amountPaidLabel", "Amount-paid label"), b.number("amountPaid", "Amount paid")),
  ]),
  b.list("taxes", "Taxes", makeBlankTax, (t) => [
    t.row(t.field("label", "Tax label"), t.number("rate", "Rate (%)")),
  ]),
  b.section("Payment", [
    b.field("paymentLabel", "Payment heading"),
    b.lines("paymentLines", "Payment details (one line each)", { rows: 4 }),
    b.textarea("notes", "Notes", { rows: 3 }),
  ]),
];
```
> Note: the schema section title used for "Line items" and "Taxes" list panels comes from the `list(...)` title. The test expands `"Line items"`, `"Adjustments"`, `"Payment"`; `"Taxes"` is its own accordion panel between them — the `expandAll` list can be extended if you assert Tax labels.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/documents/invoice/schema.test.tsx`
Expected: PASS (2 tests). If an accordion label mismatch occurs, align the `expandAll` names with the actual section/list titles.

- [ ] **Step 5: Checkpoint** — green. Leave for the user to commit.

---

## Task 7: Invoice import spec

**Files:**
- Create: `src/documents/invoice/importSpec.ts`
- Test: `src/documents/invoice/importSpec.test.ts`

**Interfaces:**
- Consumes: `str`, `strings`, `num`, `obj`, `list` from `src/import/spec.ts` (Task 3); `InvoiceData`, `sampleInvoice`.
- Produces: `invoiceImportSpec: ImportSpec` mirroring `InvoiceData` minus ids.

- [ ] **Step 1: Write the failing test**

`src/documents/invoice/importSpec.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { invoiceImportSpec } from "./importSpec";
import { sampleInvoice } from "../../data/invoice";

const contentKeys = (o: object) => Object.keys(o).filter((k) => k !== "id").sort();

describe("invoiceImportSpec", () => {
  it("mirrors the top-level content keys of InvoiceData", () => {
    expect(Object.keys(invoiceImportSpec).sort()).toEqual(contentKeys(sampleInvoice));
  });
  it("mirrors each line item's content keys", () => {
    const items = invoiceImportSpec.items;
    if (items.type !== "list") throw new Error("items must be a list");
    expect(Object.keys(items.item).sort()).toEqual(contentKeys(sampleInvoice.items[0]));
  });
  it("declares numeric fields as number nodes", () => {
    const items = invoiceImportSpec.items;
    if (items.type !== "list") throw new Error("items must be a list");
    expect(items.item.rate.type).toBe("number");
    expect(items.item.quantity.type).toBe("number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/documents/invoice/importSpec.test.ts`
Expected: FAIL — `Cannot find module './importSpec'`.

- [ ] **Step 3: Write the import spec**

`src/documents/invoice/importSpec.ts`:
```ts
import { type ImportSpec, str, strings, num, obj, list } from "../../import/spec";

const contact = obj({
  name: str(),
  line2: str(),
  address: strings(),
  detail: str(),
});

/** The invoice CONTENT contract (mirrors InvoiceData minus `id`s). */
export const invoiceImportSpec: ImportSpec = {
  title: str(),
  number: str(),
  issueDate: str(),
  dueDate: str(),
  terms: str(),
  poNumber: str(),
  currency: str(),
  from: contact,
  billTo: contact,
  items: list({
    description: str(),
    detail: str(),
    quantity: num(),
    unit: str(),
    rate: num(),
  }),
  discountLabel: str(),
  discountKind: str(),
  discountValue: num(),
  taxes: list({ label: str(), rate: num() }),
  amountPaidLabel: str(),
  amountPaid: num(),
  paymentLabel: str(),
  paymentLines: strings(),
  notes: str(),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/documents/invoice/importSpec.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Checkpoint** — green. Leave for the user to commit.

---

## Task 8: Per-template invoice color schemes

**Files:**
- Create: `src/templates/invoice/variants.ts`
- Test: `src/templates/invoice/variants.test.ts`

**Interfaces:**
- Consumes: `ColorScheme`, `FONT_PAIRINGS`, `SPACING_PRESETS`, `SIZE_PRESETS`, `Variant` from `src/theme/variants.ts`; `TemplateVariants` from `src/templates/types.ts`.
- Produces: `NORDIC_VARIANTS`, `STERLING_VARIANTS`, `PRISM_VARIANTS`, `BUREAU_VARIANTS` (each a `TemplateVariants`). Each reuses `FONT_PAIRINGS` and a template-specific `colors` list, with a `default` matching the approved demo.

- [ ] **Step 1: Write the failing test**

`src/templates/invoice/variants.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { NORDIC_VARIANTS, STERLING_VARIANTS, PRISM_VARIANTS, BUREAU_VARIANTS } from "./variants";
import { FONT_PAIRINGS } from "../../theme/variants";

describe("invoice template variants", () => {
  const all = { NORDIC_VARIANTS, STERLING_VARIANTS, PRISM_VARIANTS, BUREAU_VARIANTS };
  it("each offers ≥1 color and reuses the shared font catalog", () => {
    for (const v of Object.values(all)) {
      expect(v.colors.length).toBeGreaterThan(0);
      expect(v.fonts).toBe(FONT_PAIRINGS);
      // default colorId/fontId must exist in the offered lists
      expect(v.colors.some((c) => c.id === v.default.colorId)).toBe(true);
      expect(v.fonts.some((f) => f.id === v.default.fontId)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/templates/invoice/variants.test.ts`
Expected: FAIL — `Cannot find module './variants'`.

- [ ] **Step 3: Write the variants**

`src/templates/invoice/variants.ts`:
```ts
import type { ColorScheme } from "../../theme/variants";
import { FONT_PAIRINGS } from "../../theme/variants";
import type { TemplateVariants } from "../types";

const c = (id: string, name: string, accent: string): ColorScheme => ({ id, name, accent });

export const NORDIC_VARIANTS: TemplateVariants = {
  colors: [c("red", "Signal red", "#e5342a"), c("cobalt", "Cobalt", "#1b34d8"), c("ink", "Ink", "#0f1115")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "red", fontId: "modern" },
};

export const STERLING_VARIANTS: TemplateVariants = {
  colors: [c("green", "Bottle green", "#20463a"), c("burgundy", "Burgundy", "#7c2d3a"), c("navy", "Navy", "#1f3a5f")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "green", fontId: "editorial" },
};

export const PRISM_VARIANTS: TemplateVariants = {
  colors: [c("teal", "Teal", "#124e48"), c("plum", "Plum", "#3b2a4a"), c("rust", "Rust", "#7a3b1f")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "teal", fontId: "modern" },
};

export const BUREAU_VARIANTS: TemplateVariants = {
  colors: [c("blue", "Corporate blue", "#1e52c8"), c("slate", "Slate", "#334155"), c("teal", "Teal", "#0f766e")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "blue", fontId: "classic" },
};
```
> `fontId` defaults: `modern` = IBM Plex Sans (Nordic/Prism), `editorial` = Playfair display + Inter (Sterling), `classic` = Source Serif + Inter body (Bureau body = Inter). These map the demo's production-font intent onto the existing pairings.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/templates/invoice/variants.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — green. Leave for the user to commit.

---

## Tasks 9–12: The four invoice templates

Each template task is self-contained: a Preview component, a CSS file, a `lazyTemplate` registration module, and two tests (preload render + lazy Suspense). They share the same shape; the **full component code differs per template** and is given in each task.

**Shared conventions for all four Preview components:**
- Root: `<div className="resume-page t-<name>" style={themeCssVars(resolveVariant(variant))}>`.
- Import and call `computeTotals(data)` once; render `formatMoney(n, data.currency)` for every amount.
- Font-override hooks: `const f = (p: string) => fontStyleFor(fontOverrides, p);` applied to `data.title`, `data.from.name`, `data.billTo.name`, and each item's `description` via `joinPath`.
- **Empty-field guards** (identical rules, applied inline): skip a contact `line2`/`detail`/blank address line when empty; hide the discount row when `totals.discount === 0`; render `totals.taxes` (already empty when none); hide the PO row when `data.poNumber === ""`; hide the amount-paid row and label the emphasized figure "Amount due" when `data.amountPaid === 0` (else "Balance due"); hide the payment block when `paymentLines` is empty and the notes block when `notes` is "".
- **CSS:** create `<name>.css` by porting the matching `.t-<name>` rules from `docs/superpowers/plans/assets/invoice-demos-reference.html`, applying these mechanical transforms:
  1. Scope every rule under `.resume-page.t-<name>` (the demo used `.t-<name>`).
  2. Add page-root sizing to the template root rule: `width: var(--page-w); min-height: var(--page-h); box-sizing: border-box; background: #fff;`.
  3. Convert every `px` length to `pt` by multiplying by **0.8** (e.g. `52px → 42pt`, `12.5px → 10pt`, `40px → 32pt`). Round to one decimal.
  4. Replace the template's **primary** accent literal with `var(--c-accent)` (Nordic red, Sterling green, Prism teal rail, Bureau blue). Keep secondary literals (Sterling gold, Prism coral, Bureau slate panel + zebra) as-is.
  5. Wrap the largest 2–3 font sizes in `calc(<pt>pt * var(--s-font-scale))` so the Size preset works.
- The exact one-page fit (pt tuning) is verified in Task 13; start from the ×0.8 values.

Below, each task gives the **complete Preview component**. (The Preview is the correctness-critical, testable part; the CSS is the ported design.)

---

### Task 9: Nordic template (Minimal / Swiss)

**Files:**
- Create: `src/templates/invoice/nordic/NordicPreview.tsx`, `nordic.css`, `index.ts`, `NordicPreview.test.tsx`, `index.test.tsx`

**Interfaces:**
- Consumes: `computeTotals`, `formatMoney`, `NORDIC_VARIANTS`, `invoiceSchema`, `InvoiceData`, theme/variant/font helpers.
- Produces: `nordicTemplate: Template<InvoiceData>`.

- [ ] **Step 1: Write the failing tests**

`src/templates/invoice/nordic/NordicPreview.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NordicPreview } from "./NordicPreview";
import { sampleInvoice } from "../../../data/invoice";

describe("NordicPreview", () => {
  it("renders the balance due, a line item, and a .resume-page root", () => {
    const { container } = render(<NordicPreview data={sampleInvoice} />);
    expect(container.querySelector(".resume-page")).toBeTruthy();
    expect(screen.getByText("Brand identity system")).toBeInTheDocument();
    expect(screen.getByText("$13,048.43")).toBeInTheDocument();
    expect(screen.getByText("Cascadia Coffee Roasters")).toBeInTheDocument();
  });

  it("hides the discount, PO and deposit rows when those fields are empty", () => {
    const bare = {
      ...sampleInvoice, poNumber: "", discountValue: 0, taxes: [], amountPaid: 0,
    };
    render(<NordicPreview data={bare} />);
    expect(screen.queryByText(sampleInvoice.discountLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(/PO-/)).not.toBeInTheDocument();
    expect(screen.queryByText(sampleInvoice.amountPaidLabel)).not.toBeInTheDocument();
  });
});
```
`src/templates/invoice/nordic/index.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { nordicTemplate } from "./index";
import { sampleInvoice } from "../../../data/invoice";
import { NORDIC_VARIANTS } from "../variants";

describe("nordic template (lazy-loaded)", () => {
  it("preload() resolves to a component that renders the invoice", async () => {
    const Loaded = await nordicTemplate.preload();
    render(<Loaded data={sampleInvoice} />);
    expect(screen.getByText("$13,048.43")).toBeInTheDocument();
  });
  it("exposes a lazy Preview behind Suspense", async () => {
    render(
      <Suspense fallback={<div data-testid="loading" />}>
        <nordicTemplate.Preview data={sampleInvoice} />
      </Suspense>,
    );
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(await screen.findByText("$13,048.43")).toBeInTheDocument();
  });
  it("uses the Nordic variants", () => {
    expect(nordicTemplate.variants).toBe(NORDIC_VARIANTS);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/templates/invoice/nordic`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the Preview component**

`src/templates/invoice/nordic/NordicPreview.tsx`:
```tsx
import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import "./nordic.css";

export function NordicPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: InvoiceData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (p: string) => fontStyleFor(fontOverrides, p);
  const t = computeTotals(data);
  const money = (n: number) => formatMoney(n, data.currency);
  const address = (lines: string[]) => lines.filter((l) => l.trim());
  const hasBalance = data.amountPaid !== 0;

  return (
    <div className="resume-page t-nordic" style={themeCssVars(resolveVariant(variant))}>
      <div className="nd-topbar" />
      <header className="nd-head">
        <div className="nd-title" style={f("title")}>{data.title || "Invoice"}</div>
        <div className="nd-from">
          <b style={f("from.name")}>{data.from.name}</b>
          {data.from.line2 && <div className="nd-tag">{data.from.line2}</div>}
          {address(data.from.address).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </header>

      <div className="nd-meta">
        <div>
          <div className="nd-lbl">Billed to</div>
          <div className="nd-val">
            <b style={f("billTo.name")}>{data.billTo.name}</b>
            {data.billTo.line2 && <><br />{data.billTo.line2}</>}
            {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
          </div>
        </div>
        <div>
          <div className="nd-lbl">Invoice no.</div>
          <div className="nd-val">{data.number}</div>
          {data.poNumber && <><div className="nd-lbl nd-mt">P.O.</div><div className="nd-val">{data.poNumber}</div></>}
        </div>
        <div>
          <div className="nd-lbl">Issued</div>
          <div className="nd-val">{data.issueDate}</div>
          {data.terms && <><div className="nd-lbl nd-mt">Terms</div><div className="nd-val">{data.terms}</div></>}
        </div>
        <div>
          <div className="nd-lbl">Due</div>
          <div className="nd-val">{data.dueDate}</div>
        </div>
      </div>

      <div className="nd-items">
        <div className="nd-cols">
          <div>Description</div><div className="nd-r">Qty</div><div className="nd-r">Rate</div><div className="nd-r">Amount</div>
        </div>
        {data.items.map((it, i) => (
          <div className="nd-row" key={it.id}>
            <div className="nd-desc">
              <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
              {it.detail && <span>{it.detail}</span>}
            </div>
            <div className="nd-r">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</div>
            <div className="nd-r">{money(it.rate)}</div>
            <div className="nd-r">{money(t.lineAmounts[i])}</div>
          </div>
        ))}
      </div>

      <div className="nd-totals">
        <div className="nd-tr"><span>Subtotal</span><b>{money(t.subtotal)}</b></div>
        {t.discount > 0 && <div className="nd-tr"><span>{data.discountLabel}</span><b>−{money(t.discount)}</b></div>}
        {t.taxes.map((tx) => <div className="nd-tr" key={tx.id}><span>{tx.label}</span><b>{money(tx.amount)}</b></div>)}
        <div className="nd-tr strong"><span>Total</span><b>{money(t.total)}</b></div>
        {hasBalance && <div className="nd-tr"><span>{data.amountPaidLabel}</span><b>−{money(t.amountPaid)}</b></div>}
      </div>
      <div className="nd-totals nd-balance-wrap">
        <div className="nd-balance">
          <span className="l">{hasBalance ? "Balance due" : "Amount due"}</span>
          <span className="v">{money(t.balanceDue)}</span>
        </div>
      </div>

      {(address(data.paymentLines).length > 0 || data.notes) && (
        <div className="nd-foot">
          {address(data.paymentLines).length > 0 && (
            <div className="nd-foot-col">
              <div className="nd-lbl">{data.paymentLabel}</div>
              {address(data.paymentLines).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          {data.notes && (
            <div className="nd-foot-col"><div className="nd-lbl">Notes</div>{data.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default NordicPreview;
```

- [ ] **Step 4: Write `nordic.css`** — port the `.t-nordic` block from the reference file per the "Shared conventions" transforms above. Ensure `.resume-page.t-nordic` carries `width: var(--page-w); min-height: var(--page-h)`. Map `--nd-red` → `var(--c-accent)` (Nordic's primary accent). Add `.nd-mt { margin-top: 11pt; }` and `.nd-foot-col { flex: 1; }` (used by the component). Set `.nd-topbar` background to `var(--c-accent)`.

- [ ] **Step 5: Write the registration module**

`src/templates/invoice/nordic/index.ts`:
```ts
import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { NORDIC_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const nordicTemplate = lazyTemplate<InvoiceData>(
  {
    id: "nordic",
    name: "Nordic",
    description: "Minimal Swiss grid; balance due in signal red",
    schema: invoiceSchema,
    variants: NORDIC_VARIANTS,
  },
  () => import("./NordicPreview"),
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/templates/invoice/nordic`
Expected: PASS (5 tests).

- [ ] **Step 7: Checkpoint** — green. Leave for the user to commit.

---

### Task 10: Sterling template (Classic / serif)

**Files:**
- Create: `src/templates/invoice/sterling/SterlingPreview.tsx`, `sterling.css`, `index.ts`, `SterlingPreview.test.tsx`, `index.test.tsx`

**Interfaces:** Produces `sterlingTemplate: Template<InvoiceData>`. Same consumes as Task 9 with `STERLING_VARIANTS`.

- [ ] **Step 1: Write the failing tests** — copy Task 9's two test files into `sterling/`, replacing `Nordic`→`Sterling`, `nordicTemplate`→`sterlingTemplate`, `NORDIC_VARIANTS`→`STERLING_VARIANTS`, and the import paths. Keep the same assertions (balance `$13,048.43`, item text, `.resume-page`, hidden-rows test). Full `SterlingPreview.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SterlingPreview } from "./SterlingPreview";
import { sampleInvoice } from "../../../data/invoice";

describe("SterlingPreview", () => {
  it("renders the masthead, a line item, the balance and a .resume-page root", () => {
    const { container } = render(<SterlingPreview data={sampleInvoice} />);
    expect(container.querySelector(".resume-page")).toBeTruthy();
    expect(screen.getByText("Atelier Nord")).toBeInTheDocument();
    expect(screen.getByText("Website design")).toBeInTheDocument();
    expect(screen.getByText("$13,048.43")).toBeInTheDocument();
  });
  it("hides discount, PO and deposit rows when empty", () => {
    render(<SterlingPreview data={{ ...sampleInvoice, poNumber: "", discountValue: 0, taxes: [], amountPaid: 0 }} />);
    expect(screen.queryByText(sampleInvoice.discountLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(sampleInvoice.amountPaidLabel)).not.toBeInTheDocument();
  });
});
```
`index.test.tsx` mirrors Task 9's (Sterling names).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/templates/invoice/sterling`
Expected: FAIL.

- [ ] **Step 3: Write the Preview component**

`src/templates/invoice/sterling/SterlingPreview.tsx`:
```tsx
import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import "./sterling.css";

export function SterlingPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: InvoiceData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (p: string) => fontStyleFor(fontOverrides, p);
  const t = computeTotals(data);
  const money = (n: number) => formatMoney(n, data.currency);
  const address = (lines: string[]) => lines.filter((l) => l.trim());
  const hasBalance = data.amountPaid !== 0;

  return (
    <div className="resume-page t-sterling" style={themeCssVars(resolveVariant(variant))}>
      <div className="st-mast">
        <div className="st-rule-d" />
        <div className="st-name" style={f("from.name")}>{data.from.name}</div>
        <div className="st-tag">{[data.from.line2, address(data.from.address).slice(-2, -1)[0]].filter(Boolean).join(" · ")}</div>
        <div className="st-rule-d" />
        <div className="st-doc" style={f("title")}>{data.title || "Invoice"}</div>
      </div>

      <div className="st-info">
        <div className="who">
          <div className="sc">Billed to</div>
          <b className="an" style={f("billTo.name")}>{data.billTo.name}</b>
          {data.billTo.line2 && <><br />{data.billTo.line2}</>}
          {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
        </div>
        <div>
          <div className="sc">Particulars</div>
          <dl className="st-dl">
            <dt>Invoice No.</dt><dd>{data.number}</dd>
            <dt>Date issued</dt><dd>{data.issueDate}</dd>
            <dt>Due date</dt><dd>{data.dueDate}</dd>
            {data.terms && <><dt>Terms</dt><dd>{data.terms}</dd></>}
            {data.poNumber && <><dt>P.O. number</dt><dd>{data.poNumber}</dd></>}
          </dl>
        </div>
      </div>

      <table className="st-table">
        <thead>
          <tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={it.id}>
              <td className="desc">
                <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
                {it.detail && <span>{it.detail}</span>}
              </td>
              <td className="r num">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</td>
              <td className="r num">{money(it.rate)}</td>
              <td className="r num">{money(t.lineAmounts[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="st-totals">
        <div className="st-trow"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
        {t.discount > 0 && <div className="st-trow"><span>{data.discountLabel}</span><span className="num">−{money(t.discount)}</span></div>}
        {t.taxes.map((tx) => <div className="st-trow" key={tx.id}><span>{tx.label}</span><span className="num">{money(tx.amount)}</span></div>)}
        <div className="st-trow total"><span>Total</span><span className="num">{money(t.total)}</span></div>
        {hasBalance && <div className="st-trow"><span>{data.amountPaidLabel}</span><span className="num">−{money(t.amountPaid)}</span></div>}
        <div className="st-balance">
          <span className="l">{hasBalance ? "Balance due" : "Amount due"}</span>
          <span className="v">{money(t.balanceDue)}</span>
        </div>
      </div>

      {(address(data.paymentLines).length > 0 || data.notes) && (
        <div className="st-foot">
          <div className="st-rule-thin" />
          {address(data.paymentLines).length > 0 && <div>{data.paymentLabel}: {address(data.paymentLines).join(" · ")}</div>}
          {data.notes && <div>{data.notes}</div>}
        </div>
      )}
    </div>
  );
}

export default SterlingPreview;
```

- [ ] **Step 4: Write `sterling.css`** — port `.t-sterling` from the reference file per the shared transforms. Map the bottle-green primary accent (`--st-green` / `#20463a`) → `var(--c-accent)`; keep gold `#a6853f` as a literal. Ensure `.resume-page.t-sterling` has the page sizing. `.st-tag`, `.st-doc`, `.sc`, `.st-dl dd`, `.num` use the sans stack via `var(--f-sans)` (the demo used a `--ui` var — replace with `var(--f-sans)`), while the serif body uses `var(--f-serif)`.

- [ ] **Step 5: Write the registration module**

`src/templates/invoice/sterling/index.ts`:
```ts
import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { STERLING_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const sterlingTemplate = lazyTemplate<InvoiceData>(
  {
    id: "sterling",
    name: "Sterling",
    description: "Engraved serif masthead with double rules",
    schema: invoiceSchema,
    variants: STERLING_VARIANTS,
  },
  () => import("./SterlingPreview"),
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/templates/invoice/sterling`
Expected: PASS.

- [ ] **Step 7: Checkpoint** — green. Leave for the user to commit.

---

### Task 11: Prism template (Bold / creative)

**Files:**
- Create: `src/templates/invoice/prism/PrismPreview.tsx`, `prism.css`, `index.ts`, `PrismPreview.test.tsx`, `index.test.tsx`

**Interfaces:** Produces `prismTemplate: Template<InvoiceData>` with `PRISM_VARIANTS`.

- [ ] **Step 1: Write the failing tests** — mirror Task 9's tests in `prism/` (`Prism`/`prismTemplate`/`PRISM_VARIANTS`). Same assertions (balance `$13,048.43`, `.resume-page`, item text `Brand identity system`, hidden-rows).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/templates/invoice/prism`
Expected: FAIL.

- [ ] **Step 3: Write the Preview component**

`src/templates/invoice/prism/PrismPreview.tsx`:
```tsx
import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import "./prism.css";

/** First-letter monogram from the sender name (up to two words). */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function PrismPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: InvoiceData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (p: string) => fontStyleFor(fontOverrides, p);
  const t = computeTotals(data);
  const money = (n: number) => formatMoney(n, data.currency);
  const address = (lines: string[]) => lines.filter((l) => l.trim());
  const hasBalance = data.amountPaid !== 0;

  return (
    <div className="resume-page t-prism" style={themeCssVars(resolveVariant(variant))}>
      <aside className="pr-rail">
        <div className="pr-mark">{monogram(data.from.name).toUpperCase()}</div>
        <div className="pr-from">
          <b>{data.from.name}</b>
          {data.from.line2 && <>{data.from.line2}<br /></>}
          <br />
          {address(data.from.address).map((l, i) => <Fragment key={i}>{l}<br /></Fragment>)}
        </div>
        <div className="pr-spacer" />
        <div className="pr-invword" style={f("title")}>{(data.title || "Invoice").toUpperCase()}</div>
        <div className="pr-num">{data.number}</div>
      </aside>

      <section className="pr-body">
        <div className="pr-billrow">
          <div className="to">
            <div className="pr-k">Billed to</div>
            <b style={f("billTo.name")}>{data.billTo.name}</b>
            {data.billTo.line2 && <><br />{data.billTo.line2}</>}
            {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
          </div>
          <div className="pr-dates">
            <div className="pr-k">Issued</div>
            <div className="num">{data.issueDate}</div>
            <div className="pr-k pr-mt">Due{data.terms ? ` · ${data.terms}` : ""}</div>
            <div className="num">{data.dueDate}</div>
            {data.poNumber && <><div className="pr-k pr-mt">P.O.</div><div className="num">{data.poNumber}</div></>}
          </div>
        </div>

        <div className="pr-cols">
          <div>Description</div><div className="pr-r">Qty</div><div className="pr-r">Rate</div><div className="pr-r">Amount</div>
        </div>
        {data.items.map((it, i) => (
          <div className="pr-row" key={it.id}>
            <div className="d">
              <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
              {it.detail && <span>{it.detail}</span>}
            </div>
            <div className="pr-r">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</div>
            <div className="pr-r">{money(it.rate)}</div>
            <div className="pr-r">{money(t.lineAmounts[i])}</div>
          </div>
        ))}

        <div className="pr-tot">
          <div className="pr-tr"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
          {t.discount > 0 && <div className="pr-tr"><span>{data.discountLabel}</span><span className="num">−{money(t.discount)}</span></div>}
          {t.taxes.map((tx) => <div className="pr-tr" key={tx.id}><span>{tx.label}</span><span className="num">{money(tx.amount)}</span></div>)}
          <div className="pr-tr sum"><span>Total</span><span className="num">{money(t.total)}</span></div>
          {hasBalance && <div className="pr-tr"><span>{data.amountPaidLabel}</span><span className="num">−{money(t.amountPaid)}</span></div>}
        </div>
        <div className="pr-chip">
          <span className="l">{hasBalance ? "Balance due" : "Amount due"}</span>
          <span className="v">{money(t.balanceDue)}</span>
        </div>

        {(address(data.paymentLines).length > 0 || data.notes) && (
          <div className="pr-foot">
            {address(data.paymentLines).length > 0 && (
              <div><div className="pr-k">{data.paymentLabel}</div>{address(data.paymentLines).map((l, i) => <Fragment key={i}>{l}<br /></Fragment>)}</div>
            )}
            {data.notes && <div><div className="pr-k">Notes</div>{data.notes}</div>}
          </div>
        )}
      </section>
    </div>
  );
}

export default PrismPreview;
```

- [ ] **Step 4: Write `prism.css`** — port `.t-prism` from the reference file. `.t-prism` root is `display: flex` with the page sizing; keep `min-height: var(--page-h)`. Map the teal rail (`--pr-teal` / `#124e48`) → `var(--c-accent)` and derive a darker shade for `--pr-teal-d` if used. Keep coral `#ff6f59` and cream `#f4efe6` literals. Add `.pr-mt { margin-top: 8pt; }`. Ensure the rail width and body use the ×0.8 pt values (rail ≈ 182pt).

- [ ] **Step 5: Write the registration module**

`src/templates/invoice/prism/index.ts`:
```ts
import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { PRISM_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const prismTemplate = lazyTemplate<InvoiceData>(
  {
    id: "prism",
    name: "Prism",
    description: "Bold brand rail with an oversized wordmark",
    schema: invoiceSchema,
    variants: PRISM_VARIANTS,
  },
  () => import("./PrismPreview"),
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/templates/invoice/prism`
Expected: PASS.

- [ ] **Step 7: Checkpoint** — green. Leave for the user to commit.

---

### Task 12: Bureau template (Structured / corporate)

**Files:**
- Create: `src/templates/invoice/bureau/BureauPreview.tsx`, `bureau.css`, `index.ts`, `BureauPreview.test.tsx`, `index.test.tsx`

**Interfaces:** Produces `bureauTemplate: Template<InvoiceData>` with `BUREAU_VARIANTS`.

- [ ] **Step 1: Write the failing tests** — mirror Task 9's tests in `bureau/` (`Bureau`/`bureauTemplate`/`BUREAU_VARIANTS`). Same assertions.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/templates/invoice/bureau`
Expected: FAIL.

- [ ] **Step 3: Write the Preview component**

`src/templates/invoice/bureau/BureauPreview.tsx`:
```tsx
import { Fragment } from "react";
import type { InvoiceData } from "../../../data/invoice";
import { computeTotals, formatMoney } from "../../../documents/invoice/compute";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import "./bureau.css";

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

export function BureauPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: InvoiceData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (p: string) => fontStyleFor(fontOverrides, p);
  const t = computeTotals(data);
  const money = (n: number) => formatMoney(n, data.currency);
  const address = (lines: string[]) => lines.filter((l) => l.trim());
  const hasBalance = data.amountPaid !== 0;

  return (
    <div className="resume-page t-bureau" style={themeCssVars(resolveVariant(variant))}>
      <div className="bu-head">
        <div className="bu-logo">
          <div className="box">{monogram(data.from.name).toUpperCase()}</div>
          <div>
            <b style={f("from.name")}>{data.from.name}</b>
            <span>{[address(data.from.address)[0], data.from.detail].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
        <div className="bu-doc">
          <div className="word" style={f("title")}>{(data.title || "Invoice").toUpperCase()}</div>
          <div className="no">{data.number}</div>
          <span className="bu-pill">{hasBalance ? "Balance due" : "Amount due"}</span>
        </div>
      </div>

      <div className="bu-grid">
        <div className="bu-cell who">
          <div className="bu-k">Bill to</div>
          <b className="an" style={f("billTo.name")}>{data.billTo.name}</b>
          {data.billTo.line2 && <><br />{data.billTo.line2}</>}
          {address(data.billTo.address).map((l, i) => <Fragment key={i}><br />{l}</Fragment>)}
        </div>
        <div className="bu-cell">
          <div className="bu-k">Invoice details</div>
          <dl className="bu-dl">
            <dt>Issued</dt><dd>{data.issueDate}</dd>
            <dt>Due</dt><dd>{data.dueDate}</dd>
            {data.terms && <><dt>Terms</dt><dd>{data.terms}</dd></>}
            {data.poNumber && <><dt>P.O.</dt><dd>{data.poNumber}</dd></>}
          </dl>
        </div>
      </div>

      <table className="bu-table">
        <thead>
          <tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={it.id}>
              <td className="desc">
                <b style={f(joinPath(joinPath("items", it.id), "description"))}>{it.description}</b>
                {it.detail && <span>{it.detail}</span>}
              </td>
              <td className="r mono">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</td>
              <td className="r mono">{money(it.rate)}</td>
              <td className="r mono">{money(t.lineAmounts[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bu-foot">
        {address(data.paymentLines).length > 0 ? (
          <div className="bu-pay">
            <div className="bu-k">{data.paymentLabel}</div>
            {address(data.paymentLines).map((l, i) => <Fragment key={i}>{l}<br /></Fragment>)}
          </div>
        ) : <div />}
        <div className="bu-panel">
          <div className="r"><span>Subtotal</span><span className="mono">{money(t.subtotal)}</span></div>
          {t.discount > 0 && <div className="r"><span>{data.discountLabel}</span><span className="mono">−{money(t.discount)}</span></div>}
          {t.taxes.map((tx) => <div className="r" key={tx.id}><span>{tx.label}</span><span className="mono">{money(tx.amount)}</span></div>)}
          <div className="r sum"><span>Total</span><span className="mono">{money(t.total)}</span></div>
          {hasBalance && <div className="r"><span>{data.amountPaidLabel}</span><span className="mono">−{money(t.amountPaid)}</span></div>}
          <div className="r bal"><span className="l">{hasBalance ? "Balance due" : "Amount due"}</span><span className="mono">{money(t.balanceDue)}</span></div>
        </div>
      </div>

      {data.notes && <div className="bu-notes">{data.notes}</div>}
    </div>
  );
}

export default BureauPreview;
```

- [ ] **Step 4: Write `bureau.css`** — port `.t-bureau` from the reference file. Map corporate blue (`--bu-blue` / `#1e52c8`) → `var(--c-accent)` (used on the pill + balance rule); keep slate panel `#1f2733`, border `#d6dbe2`, zebra `#f5f7fa` literals. The `.mono` class uses a monospace stack literal (`ui-monospace, "SF Mono", Menlo, Consolas, monospace`) — invoice mono figures are not driven by the variant. Ensure the page sizing on `.resume-page.t-bureau`.

- [ ] **Step 5: Write the registration module**

`src/templates/invoice/bureau/index.ts`:
```ts
import { lazyTemplate } from "../../lazyTemplate";
import { invoiceSchema } from "../../../documents/invoice/schema";
import { BUREAU_VARIANTS } from "../variants";
import type { InvoiceData } from "../../../data/invoice";

export const bureauTemplate = lazyTemplate<InvoiceData>(
  {
    id: "bureau",
    name: "Bureau",
    description: "Boxed corporate grid with a filled totals panel",
    schema: invoiceSchema,
    variants: BUREAU_VARIANTS,
  },
  () => import("./BureauPreview"),
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/templates/invoice/bureau`
Expected: PASS.

- [ ] **Step 7: Checkpoint** — green. Leave for the user to commit.

---

## Task 13: Invoice document module + registry wiring

**Files:**
- Create: `src/documents/invoice/index.ts`
- Modify: `src/documents/registry.ts`, `src/components/create/CreateGallery.tsx`
- Test: `src/documents/invoice/index.test.ts`, extend `src/documents/registry.test.ts`

**Interfaces:**
- Consumes: `InvoiceData`, `sampleInvoice`, `invoiceImportSpec`, the four `*Template`s.
- Produces: `invoiceDocument: DocumentType<InvoiceData>`; `collectInvoiceText(data): string`; `invoiceDocument` appended to `documents`.

- [ ] **Step 1: Write the failing tests**

`src/documents/invoice/index.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { invoiceDocument, collectInvoiceText } from "./index";
import { sampleInvoice } from "../../data/invoice";

describe("invoiceDocument", () => {
  it("bundles id, sample data, import spec and four templates", () => {
    expect(invoiceDocument.id).toBe("invoice");
    expect(invoiceDocument.defaultData).toBe(sampleInvoice);
    expect(invoiceDocument.templates.map((t) => t.id)).toEqual(["nordic", "sterling", "prism", "bureau"]);
  });
  it("collectText gathers party names, an item and a payment line", () => {
    const text = collectInvoiceText(sampleInvoice);
    expect(text).toContain("Atelier Nord");
    expect(text).toContain("Cascadia Coffee Roasters");
    expect(text).toContain("Brand identity system");
    expect(text).toContain("Cascade Credit Union");
  });
});
```
Extend `src/documents/registry.test.ts` with:
```ts
it("registers the invoice document with four templates", () => {
  const invoice = documents.find((d) => d.id === "invoice");
  expect(invoice).toBeDefined();
  expect(invoice?.templates.length).toBe(4);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/documents/invoice/index.test.ts src/documents/registry.test.ts`
Expected: FAIL — module not found / invoice not registered.

- [ ] **Step 3: Write the document module**

`src/documents/invoice/index.ts`:
```ts
import type { DocumentType } from "../types";
import type { InvoiceData } from "../../data/invoice";
import { sampleInvoice } from "../../data/invoice";
import { invoiceImportSpec } from "./importSpec";
import { nordicTemplate } from "../../templates/invoice/nordic";
import { sterlingTemplate } from "../../templates/invoice/sterling";
import { prismTemplate } from "../../templates/invoice/prism";
import { bureauTemplate } from "../../templates/invoice/bureau";

/** Flatten every user-entered invoice string (plus the currency symbol) for the
 *  font-coverage scan. */
export function collectInvoiceText(data: InvoiceData): string {
  const parts: string[] = [data.title, data.number, data.issueDate, data.dueDate, data.terms, data.poNumber, data.currency];
  for (const c of [data.from, data.billTo]) parts.push(c.name, c.line2, c.detail, ...c.address);
  for (const it of data.items) parts.push(it.description, it.detail, it.unit);
  parts.push(data.discountLabel, ...data.taxes.map((t) => t.label), data.amountPaidLabel);
  parts.push(data.paymentLabel, ...data.paymentLines, data.notes);
  try {
    parts.push((0).toLocaleString("en-US", { style: "currency", currency: data.currency, currencyDisplay: "narrowSymbol" }));
  } catch { /* invalid code — the plain "$" fallback needs no glyph check */ }
  return parts.join(" ");
}

export const invoiceDocument: DocumentType<InvoiceData> = {
  id: "invoice",
  name: "Invoice",
  defaultData: sampleInvoice,
  importSpec: invoiceImportSpec,
  templates: [nordicTemplate, sterlingTemplate, prismTemplate, bureauTemplate],
  collectText: collectInvoiceText,
};
```

- [ ] **Step 4: Register it** in `src/documents/registry.ts`
```ts
import type { DocumentType } from "./types";
import { resumeDocument } from "./resume";
import { invoiceDocument } from "./invoice";

export const documents: DocumentType<any>[] = [resumeDocument, invoiceDocument];

export const defaultDocument = documents[0];
```

- [ ] **Step 5: Make the gallery expose it** — in `src/components/create/CreateGallery.tsx`, change:
```ts
const COMING_SOON_TYPES = ["Cover letter", "Invoice"];
```
to:
```ts
const COMING_SOON_TYPES = ["Cover letter"];
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/documents`
Expected: PASS — invoice index + registry (résumé default unchanged) green.

- [ ] **Step 7: Full suite + type-check**

Run: `pnpm test && pnpm build`
Expected: entire vitest suite green; `astro check` clean. This confirms the four `/build/invoice/*` routes are generated (via `buildBuilderPaths`) and the app type-checks end to end.

- [ ] **Step 8: Checkpoint** — green. Leave for the user to commit.

---

## Task 14: Browser + PDF verification

**Files:** none (verification only). Uses the scratchpad playwright-core harness.

**Goal:** Prove each template renders one clean page in the real app and exports a true-vector PDF.

- [ ] **Step 1: Build and preview**

Run: `pnpm build && pnpm preview --port 4322`
Expected: build succeeds; preview serves at `http://localhost:4322`. (Use 4322 in case dev is on 4321.)

- [ ] **Step 2: Screenshot each invoice route** — reuse the harness pattern from `browser-verification-harness` memory (playwright-core + `/usr/bin/google-chrome-stable`, `args: ["--no-sandbox"]`, `waitUntil: "domcontentloaded"`, `waitForSelector(".resume-page")`). For each of `nordic`, `sterling`, `prism`, `bureau`, load `http://localhost:4322/build/invoice/<id>/`, wait for `.resume-page`, and screenshot the `.resume-page` element.
Expected: each screenshot shows a single full page matching the approved demo. **Tune the `pt` values in each `<name>.css` if content overflows one page or looks cramped** — the ×0.8 conversion is a starting point.

- [ ] **Step 3: Mobile overflow gate** — for one route, emulate a 390px phone (`isMobile: true`) and assert `document.documentElement.scrollWidth <= 390` AND `window.innerWidth <= 390`. Confirm the Edit/Preview `.view-toggle` switches panes.
Expected: no horizontal overflow.

- [ ] **Step 4: Export and forensically verify a PDF** — in the running preview, open `/build/invoice/nordic/`, click **Download PDF**, save as `nordic.pdf`, then:
```bash
pdffonts nordic.pdf        # expect Inter / SourceSerif / Plex faces: "emb yes … uni yes"
pdftotext nordic.pdf -     # expect real text incl. "Balance due" and "13,048.43"
node scripts/inspect-pdf.mjs nordic.pdf   # expect VECTOR verdict, 0 /Image
```
Expected: embedded fonts, selectable text (proves not a raster), VECTOR verdict. Repeat for at least one more template (e.g. `bureau`, which uses the mono figures).

- [ ] **Step 5: Confirm the Style panel + import work** — on an invoice route, open the Variants popover and switch color/font/spacing/size (the sheet updates); open Import and confirm the generated prompt includes the numeric fields as `number` and that pasting `sampleInvoice`-shaped JSON validates.
Expected: variants re-render; import round-trips without validation errors.

- [ ] **Step 6: Checkpoint** — all four render one clean page and export true-vector PDFs. Feature complete. Leave the working tree for the user to review and commit.

---

## Self-Review (author's checklist — completed)

**Spec coverage:** data model → T1; compute/formatMoney → T2; numeric import node → T3; generic `Template<T>` + `collectText` + `.resume-page` decision → T4; `select`/`number` controls → T5; schema → T6; import spec → T7; per-template variants → T8; four templates + empty-field rules + font hooks → T9–T12; document + registry + gallery + routing → T13; browser + PDF + coverage verification → T14. All spec sections map to a task.

**Placeholder scan:** none — every code step contains complete code; CSS steps reference the persisted, approved reference file with explicit mechanical transforms (not "TBD").

**Type consistency:** `computeTotals`/`formatMoney`/`InvoiceTotals` names are identical across T2 and T9–T12; `collectText` identical across T4/T13; `Template<T>`/`lazyTemplate<T>` consistent T4→T9–T12; `invoiceSchema`/`makeBlankItem`/`makeBlankTax` consistent T6→T9–T13; variant constant names consistent T8→T9–T13; template ids (`nordic`/`sterling`/`prism`/`bureau`) consistent T9–T13.
