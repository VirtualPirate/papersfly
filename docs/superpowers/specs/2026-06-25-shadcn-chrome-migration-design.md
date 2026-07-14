# Migrate the editor chrome to shadcn/ui

**Status:** Approved (design) · **Date:** 2026-06-25 · **Area:** App chrome (`src/App.tsx`,
`src/forms/SchemaForm.tsx`), build config, styling

## Context

The app is a fully client-side, offline-first resume builder (Astro static shell + a
browser-only React island). It has two UI surfaces with **opposite** constraints:

1. **The PDF template** — `src/templates/classic/ClassicPreview.tsx` + `classic.css`, driven by
   `src/theme/theme.ts`. This markup is captured by jsPDF `doc.html()` and *becomes* the
   exported vector PDF. It is hand-tuned in PostScript points and is sensitive to any global
   DOM/CSS change, because `doc.html()` clones the **entire document** to render (the root
   cause of the resolved dev-toolbar bug, `docs/pdf-export-dev-toolbar.md`).
2. **The app chrome** — the topbar, document-type select, buttons, the schema-generated
   editor form (`SchemaForm`), and the warning/error bars. None of this is captured by the
   PDF. It is currently styled with hand-written CSS (`src/index.css`).

This migration adopts **shadcn/ui** for surface #2 only.

## Goals

- Rebuild the editor chrome on shadcn/ui components, adopting shadcn's default aesthetic
  (`new-york` style, `neutral` base color, **light theme only**).
- Editor sections become a shadcn **Accordion** (Basics expanded, the rest collapsed).
- Keep all existing behavior: schema-driven form, immutable updates, document switching, the
  offscreen-capture PDF download flow, and the font-coverage warning.

## Non-goals (explicitly out of scope)

- **No changes** to `ClassicPreview.tsx`, `classic.css`, or `theme.ts`. The exported PDF must
  be forensically unchanged.
- No dark mode / theme toggle.
- No toast system (the existing `Alert`-style bars are sufficient).
- No sharing of `theme.ts` tokens into the Tailwind/shadcn theme.
- No Tailwind usage in `.astro` files beyond importing the one global stylesheet.
- No unrelated refactors of `data/`, `documents/`, `forms/schema.ts`, or `templates/`.

## Decisions (resolved during brainstorming)

| Decision | Choice |
| --- | --- |
| Scope | App chrome only; template + `theme.ts` untouched |
| Aesthetic | shadcn default look, light theme (no dark mode) |
| Form layout | Accordion sections — Basics open, rest collapsed; list items as Cards |
| Migration style | Incremental, with a hard PDF-regression gate |
| Tailwind | v4 via `@tailwindcss/vite` |
| Preview-stage layout | Stays in plain CSS (measurement-sensitive); not Tailwind-ified |

## Architecture

### A. shadcn/Tailwind setup (new infrastructure)

- **Dependencies:** `tailwindcss@4`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`,
  `class-variance-authority`, `tw-animate-css`, plus the Radix primitives shadcn pulls per
  component (`@radix-ui/react-accordion`, `@radix-ui/react-select`, `@radix-ui/react-label`,
  `@radix-ui/react-slot`).
- **`astro.config.mjs`:** add `@tailwindcss/vite` to `vite.plugins`. **Keep
  `devToolbar: { enabled: false }`** — non-negotiable (PDF-corruption guard).
- **`tsconfig.json`:** add `baseUrl: "."` and `paths: { "@/*": ["src/*"] }`. Mirror with a
  Vite `resolve.alias` for `@` → `src` so both Astro/Vite and the type-checker resolve it.
- **`components.json`:** `style: "new-york"`, `baseColor: "neutral"`, `cssVariables: true`,
  aliases pointing at `@/components` and `@/lib/utils`, Tailwind CSS file at
  `src/styles/globals.css`.
- **New files:** `src/lib/utils.ts` (`cn()`), `src/styles/globals.css` (Tailwind import +
  shadcn `:root` light tokens), `src/components/ui/*` (generated: `button`, `input`,
  `textarea`, `label`, `select`, `accordion`, `card`, `alert`).
- **`src/styles/globals.css` is imported once in `BaseLayout.astro`**, alongside the existing
  `index.css` and `fonts.css`.

### B. Chrome migration map

**`App.tsx` topbar / bars:**
- Document-type `<select>` → shadcn `Select`.
- "Reset sample" → `Button variant="ghost"`.
- "Download PDF" → `Button` (preserve `disabled` + "Generating…" label).
- Error bar → `Alert variant="destructive"`; font-coverage bar → `Alert` (default). Dismiss
  control → icon `Button variant="ghost"`.

**`SchemaForm.tsx`:**
- Top-level `section` blocks → `Accordion type="multiple"`; Basics in `defaultValue`, others
  collapsed.
- `field` → `Label` + `Input`; `textarea` → `Textarea`; `lines` → `Textarea`; `tags` →
  `Input`. The split/join (separator) behavior is reused verbatim — controls only change skin.
- `row` → `grid grid-cols-2 gap-3`.
- `group` → nested block (no visual chrome of its own).
- `array`/list items → each item a `Card` with a trash `Button variant="ghost"` to remove;
  an "Add {title}" `Button variant="outline"` at the end of each list.
- **All immutability/id logic in `src/forms/update.ts` is reused unchanged.**

**Layout shell stays in `index.css`:** `.workspace` grid, `.editor` scroll column,
`.preview` stage, `.page-frame`, `.page-scaler`, and `.pdf-capture` rules pair with the
scaling math in `App.tsx` and the offscreen capture. They are left as-is; only the
editor/topbar visuals move to shadcn/Tailwind.

### C. PDF safety (load-bearing constraint)

- `ClassicPreview.tsx`, `classic.css`, `theme.ts`: **zero changes**.
- **Tailwind is configured to omit global Preflight** — import Tailwind's theme + utilities
  layers only, and apply a **chrome-scoped reset** (e.g. under the app root container)
  instead. This prevents Tailwind's global element selectors from reaching the cloned
  document that `doc.html()` renders.
- shadcn's CSS variables (`--background`, `--foreground`, `--primary`, `--radius`, …) do not
  collide with the template's (`--page-w`, `--c-ink`, …), so adding them at `:root` is safe.
- **Hard regression gate:** capture a baseline PDF from `pnpm build && pnpm preview` *before*
  any migration work. After the infra step and again at the end, regenerate and run
  `node scripts/inspect-pdf.mjs resume.pdf`, confirming an **identical verdict**: single page,
  embedded Inter + SourceSerif (`emb yes`), zero `/Image`, and the header (name/headline/
  contact) stacked at `x=56` with increasing `y`. Any drift must be neutralized on
  `.resume-page` / `.pdf-capture` before proceeding.

### D. Testing

- **Untouched** (no schema/data/template API change): `src/forms/schema.test.ts`,
  `src/forms/update.test.ts`, `src/documents/registry.test.ts`,
  `src/documents/resume/schema.test.tsx`, `src/templates/classic/index.test.tsx`,
  `src/test/sanity.test.ts`.
- **Updated to new markup:** `src/App.test.tsx`, `src/forms/SchemaForm.test.tsx`. Prefer
  role/label queries over class/structure queries so they stay resilient. **Radix Accordion
  unmounts collapsed content**, so any test touching a non-Basics section must expand it
  first.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Global CSS perturbs the exported PDF (primary) | No-Preflight + chrome-scoped reset; before/after forensic gate via `inspect-pdf.mjs` |
| Test churn in `App.test`/`SchemaForm.test` | Expected and planned; query by role/label |
| Accordion hides collapsed content from the DOM | Tests expand the relevant section first |
| Island bundle grows from Radix primitives | Acceptable; build-time Tailwind adds no runtime, offline behavior fully preserved |

## Acceptance criteria

1. `pnpm build` (astro check + build) passes; `pnpm test` passes.
2. The editor chrome renders with shadcn's `new-york`/`neutral` aesthetic; sections are an
   accordion (Basics open); list items are cards with add/remove.
3. Document switching, field editing, list add/remove, the font-coverage warning, and the
   PDF download flow all still work.
4. `node scripts/inspect-pdf.mjs resume.pdf` returns the **same forensic verdict** as the
   pre-migration baseline (single page, embedded Inter/SourceSerif, zero `/Image`, header
   stacked at `x=56`).
5. `ClassicPreview.tsx`, `classic.css`, and `theme.ts` are unchanged in the diff.
