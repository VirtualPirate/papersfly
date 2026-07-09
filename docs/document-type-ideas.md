# Document types this builder could support

A menu of candidate document types for `vector-resume-builder`, ranked by how
well they fit the architecture and how much work each would take. Use it to pick
what to build next. Today the app ships **Résumé** and **Invoice**.

## What makes a good fit (the litmus test)

The engine is a client-side, offline, **true-vector PDF** generator: the same
rendered HTML/CSS is both the on-screen preview and the PDF source
(`doc.html()`), authored once. A document type fits well when it is:

- **Form-shaped** — its content maps to a fixed schema (sections, lists, rows,
  fields) so the auto-generated editor can drive it.
- **Print / PDF-first** — the user's goal is to download a clean PDF.
- **US Letter portrait, mostly 1 page** — the page is a fixed `612 × 792pt`
  constant (`theme.page`). Multi-page now breaks block-aware but is still coarse
  (see root `CLAUDE.md`). Landscape or small formats (cards, envelopes) need a
  page-geometry change first.
- **Text + simple vector graphics only** — no raster: logos are monograms/text,
  never `<img>` (a raster would break the vector guarantee).
- **Latin-script** — fonts are subset to Latin; other scripts are warned and
  dropped. Fine for global business docs, wrong for a CJK-first product.
- **Offline & serverless** — no e-signature, no live payment, no data fetch. A
  *printable* contract is fine; a *signed/executed* one is out of scope.

If an idea fails one of these, it's flagged in the tiers below.

## Cost of adding one type

Per `src/templates/CLAUDE.md` ("Add a new DOCUMENT TYPE"), each new type is
roughly: a `data/<type>.ts` (interfaces + sample) · optional pure `compute.ts`
(money/dates) · a `documents/<type>/schema.ts` · an `importSpec.ts` (the AI
prompt + validator generate from it) · a `documents/<type>/index.ts`
(`DocumentType`) · registry entry · **≥1 template** (5 files). Types that reuse
an existing schema/compute are dramatically cheaper.

---

## Tier 1 — Highest fit, lowest effort

Near-clones of what already exists; mostly reuse the invoice or a shared letter
layout.

| Type | Reuses | Notes |
|---|---|---|
| **Quote / Estimate** | Invoice schema + `compute.ts` almost verbatim | Same line-items + totals; relabel ("Quote", "Valid until"). Practically free. |
| **Receipt** | Invoice (trimmed) | Proof of payment: "Paid" state, paid date, method. |
| **Purchase Order** | Invoice (buyer-issued) | Swap from/to semantics, add PO terms. |
| **Credit Note / Credit Memo** | Invoice | Negative/refund variant of an invoice. |
| **Cover Letter** | New but tiny; shares résumé contact block | Letterhead + salutation + body + sign-off. Natural résumé companion. |
| **Business / Formal Letter** | Shared "letter" layout | Sender/recipient blocks, date, subject, body, signature. Extremely versatile base other letter types build on. |

## Tier 2 — Strong fit, moderate effort

New schema, but the same single-column / table + totals paradigm and vector
constraints apply cleanly.

| Type | Category | Notes |
|---|---|---|
| **Proposal / Statement of Work** | Business | Scope, deliverables, timeline, pricing table. Text-heavier, multi-page. |
| **Timesheet** | Business | Days × hours × project, total. Table + `compute`. |
| **Expense Report** | Business | Line items + category + total. Invoice-like. |
| **Price List / Rate Card** | Business | Services/products + prices; strongly typographic. |
| **Menu** (café/restaurant) | Hospitality | Sections + items + prices; great type/vector showcase. |
| **Reference Sheet** | Career | Résumé companion: list of referees. Trivial schema. |
| **Bio / One-pager** | Career/personal | Speaker/founder bio, links, highlights. |
| **Academic CV** | Career | Long-form résumé (publications, grants); leans on multi-page. |
| **Meeting Agenda** | Office | Topics, owners, time-boxes. |
| **Meeting Minutes** | Office | Attendees, decisions, action items. |
| **Itinerary** | Travel/events | Day-by-day schedule blocks. |
| **Event Program** | Events | Ordered schedule of a ceremony/conference. |
| **Certificate of Completion** | Education | Recipient, course, date, signatory. *Best in landscape → needs page-size support (see Tier 3 note).* |

## Tier 3 — Possible, but with a caveat to resolve first

Worth doing, but each trips one constraint that needs a decision.

| Type | Caveat |
|---|---|
| **Certificate / Award / Diploma** | Wants **landscape** + decorative border. Requires making page geometry configurable (currently one portrait constant). |
| **Business Card** | Different **small page size** (e.g. 3.5×2in); otherwise a perfect text+monogram vector fit. |
| **Envelope / Address Label** | Non-Letter **page size**; simple content. |
| **Flyer / Poster** | **Design-heavy**, less form-driven; single page works but the value is in layout freedom the schema editor limits. |
| **Wedding Invitation / Save-the-Date** | Decorative and often a **non-Letter size**; strong vector fit otherwise. |
| **Gift Certificate / Voucher** | Small/landscape format; decorative. |
| **Recipe Card** | Often a **card size**; content (ingredients + steps) is easy. |
| **Contract / NDA / Lease / Letter of Intent** | Long **legal body text**, multi-page (coarse pagination), and no real **e-signature** offline — ship as a *printable* doc only. |
| **Newsletter (print)** | **Multi-column** flow the current single-column pagination/preview doesn't model. |
| **Event Ticket / Boarding-pass style** | Needs a **QR/barcode** (drawable as vector rectangles, but new tooling) and a small format. |

## Not a good fit (out of scope)

- Anything requiring **photos, scanned logos, or raster images** (photo ID cards,
  image-led brochures) — breaks the true-vector guarantee.
- **Executed** contracts / anything needing a real **e-signature or notarization**,
  **live payments**, or **server-side data** — the app is offline/serverless.
- **CJK / RTL / non-Latin-first** documents — the font subset is Latin.
- **Spreadsheets / dense financial tables** spanning many pages — pagination is
  coarse and layout is print-fixed.

---

## Suggested order

1. **Quote/Estimate** and **Receipt** — almost free (reuse invoice), immediate
   breadth for the same freelancer/SMB audience.
2. **Cover Letter** + a shared **Business Letter** base — unlocks the whole
   letter family and pairs with the résumé.
3. Then pick from Tier 2 by audience (business ops vs. career vs. hospitality).
4. Tackle **page-size configurability** once, which unlocks the entire Tier 3
   landscape/card cluster (certificates, business cards, invitations).
