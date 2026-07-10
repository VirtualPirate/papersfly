---
name: create-template
description: Use when adding or porting a new visual design (template) for an existing document type (résumé or invoice) in this repo — triggers include "add a template", "new résumé design", "new invoice layout", "port this mockup/screenshot into a template", "make a design like <image>". Not for creating a new document KIND (data + schema); that is a separate, larger flow.
---

# Creating a template

A **template** is one design over an existing document type's data. Same rendered
DOM is both the on-screen preview AND the true-vector PDF source — you author the
design once. This skill takes a design (optionally from a user reference) through
a **scratchpad HTML demo the user approves** before any real template code is written.

## Step 0 — Read the authoring guide (REQUIRED)

Read `src/templates/AGENTS.md` in full before anything else — it is the
authoritative contract (`Template<T>`, the 5-file folder, page-break markers,
variants, font rules). Skim the root `AGENTS.md` for the big picture. This skill
does not restate that guide; it drives the workflow and re-flags only the
invariants most often gotten wrong.

## Step 1 — Gather inputs

Ask the user (one at a time when unclear):
- **Document type:** `resume` or `invoice` (must already exist in `documents/registry.ts`).
- **Name + id:** display name (e.g. "Nordic") and slug id (e.g. `nordic`), unique within that doc type.
- **Design reference (optional):** an image → view it; a standalone HTML mock → read it; or neither → work from a text description.

Copy the closest existing sibling folder to learn the current shape (e.g.
`src/templates/invoice/nordic/` or `src/templates/resume/classic/`).

## Step 2 — Decide variants

Ask which colors, fonts, and the single **signature display element** (the one
big title / wordmark that gets the display face).

| Doc type | Colors | Fonts |
|---|---|---|
| **résumé** | reuse global `COLOR_SCHEMES` (`theme/variants.ts`); `resolveVariant(variant)` needs no 2nd arg | reuse `FONT_PAIRINGS` |
| **invoice** | bespoke palette in `invoice/variants.ts`; MUST pass it: `resolveVariant(variant, X_VARIANTS.colors)` | reuse `FONT_PAIRINGS` |

`default` must reference ids that exist in this template's `colors`/`fonts`.

## Step 3 — Build a scratchpad HTML demo, then serve + screenshot it

Write a self-contained HTML/CSS file named **`demo.html`** to the scratchpad dir
at **true US-Letter size (612pt × 792pt)**, showing the design with its default
variant. Author it already obeying the porting constraints (Step 5) so the demo
matches the eventual PDF. Match the chosen pairing's real faces so it reflects the
true PDF: the default pairing maps display/body to specific families in
`theme/variants.ts` (e.g. `modern` → IBM Plex Sans, `editorial` → Playfair) — use
those exact families (a Google Fonts `<link>` in the scratchpad file is fine since
the demo is throwaway), not a generic `sans-serif` stack.

Then produce BOTH review artifacts:

1. **Serve it on a local port** (background) so the user opens it in a real
   browser — agent- and harness-agnostic, no Claude Artifact:
   ```bash
   node .claude/skills/create-template/serve.mjs <scratchpad-dir> 4319 &
   ```
   The URL to hand the user is `http://localhost:4319/demo.html`.
2. **Screenshot it** for a static reference:
   ```bash
   node .claude/skills/create-template/screenshot.mjs <scratchpad-dir>/demo.html <scratchpad-dir>/demo.png
   ```

Do NOT use a Claude Artifact for the demo — the port-served HTML is the required
mechanism so this skill works from any coding agent.

## Step 4 — Review gate (HARD)

**Proactively present the demo the moment it is ready — you MUST give the user
the `http://localhost:4319/demo.html` URL (and the screenshot path) in your reply
without being asked.** Never leave the demo sitting unshown; the user cannot see
the rendered image otherwise.

Then STOP and wait for explicit approval. Iterate on the demo until the user
approves. **Do NOT create any file under `src/templates/` before approval.**

## Step 5 — Port into a real template

Create `src/templates/<docType>/<name>/` with the five files per AGENTS.md
(`<Name>Preview.tsx`, `<name>.css`, `index.ts`, `<Name>Preview.test.tsx`,
`index.test.tsx`), then register it (document's `templates` list; also
`resume/registry.ts` for résumés; add the palette to `invoice/variants.ts` for
invoices). Re-read the AGENTS.md "Add a new DESIGN" section as the checklist.

**Start by copying the closest sibling verbatim** (e.g. `invoice/nordic/`) and
editing down — its skeleton already carries three things the AGENTS.md snippets
omit: `variant = DEFAULT_VARIANT` as the prop default (imported from
`theme/variants`), the `import "./<name>.css"` in the Preview that drives
code-splitting, and the correct **2-arg nested** `joinPath(joinPath("items",
it.id), "description")` form.

**Invariants most often gotten wrong — verify each:**
- Root element carries the class **`resume-page`** (the PDF capture root) plus `t-<name>`. Never rename `resume-page`.
- CSS is **self-contained and scoped** under `.resume-page.t-<name>`; the root rule sets its own `width/min-height/box-sizing/background/color/font-family`.
- **Geometry in `pt`**, not px. Wrap the largest 2–3 sizes in `calc(<pt>pt * var(--s-font-scale))` and section gaps in `var(--sp-section-scale)` so presets work.
- Route the **one signature element to `var(--f-serif)`**, everything else to `var(--f-sans)` — else the display face is silently ignored.
- Stay in the embeddable set: weights **{400,600,700}**, **no italic**, **no literal/system `font-family`**, **no `<img>`/raster**.
- **Page-break markers**: `data-pdf-block` on every keep-together block (rows, totals, footer — on `<tr>` for table item lists), `data-pdf-heading` on section titles that must stay with their first block. Required or the preview divider won't show and the PDF will slice mid-block. (Two-column Atlas is the sole intentional exception.)
- Empty-field guards hide optional content; never inline money arithmetic.

## Step 6 — Verify

- `pnpm test` (includes `fonts.test.ts` + marker tests).
- `pnpm build && pnpm verify:pdf` — the forensic gate (browser-only PDF path is the source of truth). Fails on any raster or fallback font.
- Confirm one-page fit: `.resume-page` `offsetHeight ≤ 1056px` at true size.
- **Do not commit** — the user handles all git commits.

## Common mistakes

- Not showing the demo until asked — always hand over the served URL proactively (Step 4).
- Using a Claude Artifact for the demo instead of the port-served HTML (breaks non-Claude agents).
- Writing template files before the demo is approved.
- Sending all text through `--f-sans` (display face never appears).
- px geometry, `font-weight: 500/800`, italic, or a raw font stack — all degrade silently in the PDF.
- Forgetting `resolveVariant(variant, X_VARIANTS.colors)` for an invoice's bespoke palette.
- Skipping `data-pdf-block`, so the exported PDF splits a row across pages.
