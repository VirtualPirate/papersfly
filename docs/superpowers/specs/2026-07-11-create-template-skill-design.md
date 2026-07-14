# Design: `create-template` skill

Date: 2026-07-11

## Goal

A project-scoped skill that guides an agent through adding a **new design
(Template)** for an *existing* document type (resume or invoice) in this repo,
optionally from a user-supplied design reference, with a scratchpad HTML demo
that the user reviews and approves **before** any real Template code is written.

Scope is deliberately limited to the "add a new DESIGN" flow. Creating a new
**document type** (data + schema + importSpec) is out of scope.

## Location

`.claude/skills/create-template/SKILL.md` (this repo currently has no skills).

## Load-bearing reference

The skill's first instruction is to read `src/templates/AGENTS.md` (the
templates folder's "CLAUDE.md", which is `@AGENTS.md`). That file is the
authoritative authoring guide: the `Template<T>` contract, the 5-file design
folder, page-break markers, font constraints, and variants. The skill points
there rather than duplicating it, and re-states only the highest-risk
invariants inline.

## Workflow encoded in SKILL.md

1. **Read `src/templates/AGENTS.md` first** (and the root `AGENTS.md` for the
   big picture: client-side, true-vector PDF via `doc.html()`, geometry in pt).

2. **Gather inputs.** Ask which document type (`resume` / `invoice`), the
   template `name` + `id` slug (unique within the doc type), and whether the
   user has a **design reference**:
   - image → view it;
   - standalone HTML mock → read it;
   - neither → work from a text description.
   Reference is optional.

3. **Ask variant questions** (colors + fonts + the one signature display
   element):
   - *resume:* reuse global `COLOR_SCHEMES` + `FONT_PAIRINGS`
     (`theme/variants.ts`); choose a subset and a `default`.
   - *Invoice:* define a bespoke palette in `invoice/variants.ts` (must be
     passed to `resolveVariant(variant, X_VARIANTS.colors)`); choose font
     pairings + `default`.

4. **Build a scratchpad HTML demo.** A self-contained HTML/CSS file at true
   US-Letter size (612×792pt) in the scratchpad dir, reflecting the design +
   default variant, already obeying the porting constraints:
   - geometry authored in `pt`;
   - font weights clamped to {400, 600, 700}, no italic, no literal/system
     `font-family`;
   - the ONE signature element routed to the display face, everything else to
     the body face;
   - no `<img>`/raster.
   Open/screenshot it for review.

5. **Review gate (HARD).** Present the demo; iterate until the user approves.
   No real Template code is written before approval.

6. **Port into a real Template** — the 5-file folder per AGENTS.md:
   - `<Name>Preview.tsx` — root `<div className="resume-page t-<name>" …>`;
     `themeCssVars(resolveVariant(...))`; font-override hook; empty-field
     guards; `data-pdf-block` / `data-pdf-heading` markers; default export.
   - `<name>.css` — self-contained, scoped under `.resume-page.t-<name>`; root
     sets its own box; pt geometry; `--f-serif`/`--f-sans` slots; size/spacing
     preset `calc()`s; accent from `var(--c-accent)`.
   - `index.ts` — `lazyTemplate<T>(meta, () => import("./<Name>Preview"))`.
   - `<Name>Preview.test.tsx` + `index.test.tsx` — copy a sibling, adapt.
   - Register: document's `templates` list; `resume/registry.ts` for resumes;
     palette entry in `invoice/variants.ts` for invoices.

7. **Verify** — `pnpm test`, then `pnpm build && pnpm verify:pdf` (forensic
   gate), and confirm one-page fit (`.resume-page` `offsetHeight ≤ 1056px`).
   Do NOT commit — the user handles all git commits.

## Non-goals

- New document types (data/schema/importSpec/document module).
- Multi-page layouts (engine support is degraded).
- Any server/headless PDF path.

## Notes

- Authored with the `writing-skills` skill.
- No git commit step (user preference).
