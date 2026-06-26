# shadcn/ui Chrome Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the editor chrome (topbar, document-type select, buttons, warning/error bars, and the schema-generated form) on shadcn/ui, without changing the exported vector PDF.

**Architecture:** Add Tailwind v4 + shadcn/ui to the existing Astro + React 19 island. Migrate only the chrome inside `App.tsx` and `SchemaForm.tsx`. The résumé template (`ClassicPreview.tsx`, `classic.css`, `theme.ts`) — the source `doc.html()` captures into the PDF — is left byte-for-byte untouched. Tailwind's global Preflight is omitted in favor of a reset scoped to `.app` that explicitly excludes the preview/capture subtree, because `doc.html()` clones the entire document.

**Tech Stack:** Astro 5, React 19, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (`new-york`, `neutral`), Radix primitives, lucide-react, Vitest + Testing Library, pnpm.

## Global Constraints

- **Do NOT modify** `src/templates/classic/ClassicPreview.tsx`, `src/templates/classic/classic.css`, or `src/theme/theme.ts`. The final `git diff` must show zero changes to these three files.
- **Keep `devToolbar: { enabled: false }`** in `astro.config.mjs` (PDF-corruption guard).
- shadcn config: style `new-york`, base color `neutral`, **light theme only**, CSS variables on.
- **No global Tailwind Preflight.** Import Tailwind's `theme` + `utilities` layers only; provide a chrome-scoped reset that never matches `.preview`, `.preview *`, `.pdf-capture`, or `.pdf-capture *`.
- Reuse `src/forms/update.ts` (`addItem`/`removeItem`/`updateItem`/`newId`) verbatim — no changes to immutability/id logic.
- **PDF forensic gate** (run after Task 2 and Task 6): the regenerated PDF must match the baseline — single page, embedded `Inter` + `SourceSerif` (`emb yes`), zero `/Image`, header (name/headline/contact) stacked at `x=56`.
- Package manager is **pnpm**. Run a single test file with `pnpm exec vitest run <path>`; by name with `pnpm exec vitest run -t "<name>"`. Full suite: `pnpm test`. Type-check + build: `pnpm build`.
- **Commits:** each task ends with a `git commit` checkpoint. Only run it if the user has authorized commits for the execution session; otherwise treat it as a stop-for-review point and leave the changes staged.

---

### Task 1: Tailwind v4 + path aliases + global stylesheet + jsdom polyfills

Stands up Tailwind and the `@/*` alias, proves the alias resolves end-to-end via the `cn()` util, and confirms adding a global stylesheet doesn't disturb the PDF. No shadcn components yet.

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Modify: `astro.config.mjs`
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Modify: `src/test/setup.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/styles/globals.css`
- Create: `src/lib/utils.ts`
- Test: `src/lib/utils.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` from `@/lib/utils`. The `@/*` → `src/*` alias resolves in Astro/Vite, tsc, and Vitest.

- [ ] **Step 1: Record the PDF baseline**

Run: `node scripts/inspect-pdf.mjs resume.pdf`
Expected: a VECTOR verdict — single page, embedded `Inter`/`SourceSerif` (`FontFile2`, `Type0`/`CIDFontType2`), zero images, ~2k chars of text. Copy the printed summary into the task notes; it is the comparison target for the Task 6 gate.

- [ ] **Step 2: Install dependencies**

```bash
pnpm add clsx tailwind-merge class-variance-authority lucide-react
pnpm add -D tailwindcss @tailwindcss/vite tw-animate-css
```

- [ ] **Step 3: Create the `cn()` util**

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, de-duplicating conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Write the failing alias/util test**

Create `src/lib/utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy classes and drops falsy ones", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("merges conflicting tailwind utilities so the last one wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/utils.test.ts`
Expected: FAIL — Vitest cannot resolve the `@/lib/utils` import (alias not configured yet).

- [ ] **Step 6: Add the `@` alias to Vitest**

Modify `vitest.config.ts` to add a `resolve.alias` (and the `node:url` import):

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Standalone test config, decoupled from Astro. Covers the React components and
// pure-TS modules exactly as before the migration.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/utils.test.ts`
Expected: PASS (both cases).

- [ ] **Step 8: Add the `@` alias to TypeScript**

Modify `tsconfig.json` `compilerOptions` to add `baseUrl` + `paths`:

```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

- [ ] **Step 9: Wire Tailwind v4 + the `@` alias into Astro/Vite**

Modify `astro.config.mjs` — add the imports at the top and the `plugins`/`resolve` keys to the existing `vite` block (leave `build` and `optimizeDeps` as-is):

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
```

```js
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    build: {
      // The base64 embedded-font module is intentionally large on the PDF path.
      chunkSizeWarningLimit: 1600,
    },
    // Pre-bundle jsPDF + its dynamic html2canvas backend so the first Download
    // click in `astro dev` doesn't trigger a dep re-optimization + full reload.
    optimizeDeps: {
      include: ["jspdf", "jspdf > html2canvas"],
    },
  },
```

- [ ] **Step 10: Create the global stylesheet (Tailwind, no Preflight)**

Create `src/styles/globals.css`. shadcn tokens and the scoped reset are added in Task 2; for now just the Tailwind layers so the build wires up:

```css
/* Tailwind v4 — theme + utilities only. Preflight (a global element reset) is
   intentionally OMITTED: doc.html() (jsPDF) clones the ENTIRE document to render
   the PDF, so a global reset risks changing the exported résumé. shadcn tokens
   and a chrome-scoped reset are added in Task 2. */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "tw-animate-css";
```

- [ ] **Step 11: Import the global stylesheet in the layout**

Modify `src/layouts/BaseLayout.astro` — add the import **after** the existing CSS imports (so shadcn tokens, added in Task 2, win the `--accent` collision against `index.css`):

```astro
---
import "../index.css";
import "../fonts/fonts.css";
import "../styles/globals.css";
import interRegular from "../fonts/inter-regular.ttf?url";
```

- [ ] **Step 12: Add Radix-required jsdom polyfills**

Modify `src/test/setup.ts` — append after the existing `ResizeObserver` stub:

```ts
// Radix UI primitives (Select, Accordion) call these jsdom-missing APIs.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!globalThis.matchMedia) {
  (globalThis as unknown as Record<string, unknown>).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
```

- [ ] **Step 13: Verify build + full test suite + PDF unchanged**

Run: `pnpm build`
Expected: `astro check` reports 0 errors; build writes `dist/`.

Run: `pnpm test`
Expected: all existing tests pass plus the 2 new `cn` cases.

Run: `pnpm preview`, open the printed URL, click **Download PDF**, save as `resume.pdf` (overwrite), then `node scripts/inspect-pdf.mjs resume.pdf`.
Expected: identical verdict to the Step 1 baseline (single page, `Inter`/`SourceSerif` embedded, zero images, header stacked at `x=56`). Stop `preview` afterward.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "build: add Tailwind v4 + @/ alias + global stylesheet (no shadcn yet)"
```

---

### Task 2: shadcn/ui setup — tokens, components, chrome-scoped reset

Adds the shadcn config, the `neutral` light tokens, the chrome-scoped reset, and the component files. End state: shadcn components are importable from `@/components/ui/*` and the PDF is still unchanged.

**Files:**
- Create: `components.json`
- Modify: `src/styles/globals.css`
- Create: `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `select.tsx`, `accordion.tsx`, `card.tsx`, `alert.tsx` (generated by the shadcn CLI)

**Interfaces:**
- Produces: `Button`, `Input`, `Textarea`, `Label`, `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`, `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`, `Card`, `Alert`/`AlertTitle`/`AlertDescription` — all importable from `@/components/ui/<name>`.

- [ ] **Step 1: Create `components.json`**

Create `components.json` at the repo root:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Add shadcn tokens + `@theme inline` + the chrome-scoped reset to `globals.css`**

Replace the contents of `src/styles/globals.css` with:

```css
/* Tailwind v4 — theme + utilities only. Preflight (a global element reset) is
   intentionally OMITTED: doc.html() (jsPDF) clones the ENTIRE document to render
   the PDF, so a global reset risks changing the exported résumé. The scoped
   reset at the bottom re-creates only what shadcn/ui needs, and never matches
   the preview/capture subtree. */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}

/* ---- Chrome-scoped reset (replaces the omitted Preflight) ---------------
   Applies only inside .app, and NEVER to .preview/.pdf-capture — the résumé
   template that becomes the PDF. :where() keeps specificity at 0 so Tailwind
   utility classes (utilities layer) always win over this base-layer reset. */
@layer base {
  .app :where(*):not(.preview, .preview *, .pdf-capture, .pdf-capture *) {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: var(--border);
  }
  .app :where(button):not(.preview *, .pdf-capture *) {
    cursor: pointer;
    background-color: transparent;
    background-image: none;
  }
  .app :where(button, input, textarea, select):not(.preview *, .pdf-capture *) {
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
  }
  .app :where(button):disabled:not(.preview *, .pdf-capture *) {
    cursor: default;
  }
}
```

- [ ] **Step 3: Generate the shadcn components**

Run:

```bash
pnpm dlx shadcn@latest add button input textarea label select accordion card alert
```

Expected: creates `src/components/ui/{button,input,textarea,label,select,accordion,card,alert}.tsx`. If the CLI offers to overwrite `src/styles/globals.css` or `components.json`, **decline** — those are already authored above. If it cannot detect the framework, accept its prompts for an Astro + Tailwind project and then re-confirm `globals.css` still matches Step 2 (re-apply Step 2 if the CLI rewrote it).

- [ ] **Step 4: Verify the components type-check and build**

Run: `pnpm build`
Expected: `astro check` 0 errors (the generated components import from `@/lib/utils` and Radix packages, all resolvable); build succeeds.

- [ ] **Step 5: Verify the existing test suite still passes**

Run: `pnpm test`
Expected: all tests green (no chrome consumed shadcn yet, so behavior is unchanged).

- [ ] **Step 6: PDF gate — confirm the tokens + reset didn't disturb the PDF**

Run: `pnpm preview`, download `resume.pdf` (overwrite), then `node scripts/inspect-pdf.mjs resume.pdf`.
Expected: identical verdict to the Task 1 baseline. This is the primary risk checkpoint — if the header is no longer stacked at `x=56` or fonts/images changed, stop and inspect the scoped reset's `:not()` exclusions before continuing. Stop `preview` afterward.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui setup, tokens, and chrome-scoped reset"
```

---

### Task 3: Migrate the topbar (Select + Buttons)

Replaces the native `<select>` and `<button>`s in the topbar with shadcn `Select` and `Button`, and updates the one App test that asserted native-select internals.

**Files:**
- Modify: `src/App.tsx` (imports; topbar block at `src/App.tsx:140-166`)
- Test: `src/App.test.tsx` (the "document-type selector" test)

**Interfaces:**
- Consumes: `Button` and `Select*` from `@/components/ui/*` (Task 2). `handleDocChange(id: string)` and `handleDownload`/`handleReset`/`downloading` already exist in `App.tsx`.

- [ ] **Step 1: Update the failing App test for the shadcn Select**

In `src/App.test.tsx`, replace the `"shows a document-type selector defaulting to the resume"` test body with:

```tsx
  it("shows a document-type selector defaulting to the resume", async () => {
    render(<App />);
    // shadcn/Radix Select renders a combobox button showing the current value.
    const select = screen.getByRole("combobox", { name: "Document type" });
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent("Résumé");
    // Flush the lazy preview so its resolution is wrapped in act().
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/App.test.tsx -t "document-type selector"`
Expected: FAIL — there is still a native `<select>` (role `combobox` query may match it, but `toHaveTextContent("Résumé")` fails because a native select renders `<option>`s, not the value text, and `aria-label` resolution differs). Confirms the test now targets the shadcn markup.

- [ ] **Step 3: Add the shadcn imports to `App.tsx`**

At the top of `src/App.tsx`, after the existing imports, add:

```tsx
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

- [ ] **Step 4: Replace the topbar markup**

In `src/App.tsx`, replace this block:

```tsx
      <header className="topbar">
        <div className="brand">
          <h1>Vector Résumé Builder</h1>
          <span className="tag">live preview · true-vector PDF · 100% offline</span>
        </div>
        <div className="topbar-actions">
          <select
            aria-label="Document type"
            className="doc-select"
            value={doc.id}
            onChange={(e) => handleDocChange(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={handleReset}>
            Reset sample
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : "↓ Download PDF"}
          </button>
        </div>
      </header>
```

with:

```tsx
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-5 py-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-base font-bold tracking-tight">Vector Résumé Builder</h1>
          <span className="text-xs text-muted-foreground">
            live preview · true-vector PDF · 100% offline
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Select value={doc.id} onValueChange={handleDocChange}>
            <SelectTrigger aria-label="Document type" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={handleReset}>
            Reset sample
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : "↓ Download PDF"}
          </Button>
        </div>
      </header>
```

- [ ] **Step 5: Run the App tests to verify they pass**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: all 3 App tests pass (the download test still finds `getByRole("button", { name: /download pdf/i })` — shadcn `Button` renders a real `<button>`).

- [ ] **Step 6: Verify the build**

Run: `pnpm build`
Expected: 0 type errors; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate topbar select + buttons to shadcn/ui"
```

---

### Task 4: Migrate the warning/error bars to Alert

Replaces the two `.warning-bar` divs with shadcn `Alert`, keeps the dismiss control as an icon `Button`, and adds a behavior test for the error path.

**Files:**
- Modify: `src/App.tsx` (imports; the `error` and `unsupported` blocks at `src/App.tsx:168-187`)
- Test: `src/App.test.tsx` (new test for the dismissable error alert)

**Interfaces:**
- Consumes: `Alert`/`AlertTitle`/`AlertDescription` and `Button` from `@/components/ui/*`; `CircleAlert`/`TriangleAlert`/`X` from `lucide-react`. `error`/`setError`/`unsupported` already exist in `App.tsx`.

- [ ] **Step 1: Write the failing error-alert test**

In `src/App.test.tsx`, add this test inside the `describe("App", …)` block:

```tsx
  it("surfaces a dismissable error alert when PDF generation fails", async () => {
    vi.mocked(downloadResumePdf).mockRejectedValueOnce(new Error("boom"));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("PDF error");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.queryByText("PDF error")).not.toBeInTheDocument(),
    );
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/App.test.tsx -t "dismissable error alert"`
Expected: FAIL — the current `.warning-bar` has no "PDF error" title text (it renders "PDF error:" inline as a `<strong>`, but the `role="alert"` + structured title assertion targets the Alert markup). Confirms the test drives the new markup.

- [ ] **Step 3: Add the Alert + icon imports to `App.tsx`**

At the top of `src/App.tsx`, add:

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert, TriangleAlert, X } from "lucide-react";
```

- [ ] **Step 4: Replace the warning/error bar markup**

In `src/App.tsx`, replace this block:

```tsx
      {error && (
        <div className="warning-bar" role="alert">
          <span>
            <strong>PDF error:</strong> {error}
          </span>
          <button className="bar-dismiss" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {unsupported.length > 0 && (
        <div className="warning-bar" role="alert">
          <span>
            <strong>Heads up:</strong> this template's font can't render{" "}
            {unsupported.slice(0, 12).map((c) => `"${c}"`).join(", ")}
            {unsupported.length > 12 ? " …" : ""}. Those characters will be left out of the PDF.
          </span>
        </div>
      )}
```

with:

```tsx
      {error && (
        <Alert variant="destructive" className="shrink-0 rounded-none border-x-0 border-t-0">
          <CircleAlert />
          <AlertTitle>PDF error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </Alert>
      )}

      {unsupported.length > 0 && (
        <Alert className="shrink-0 rounded-none border-x-0 border-t-0">
          <TriangleAlert />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            This template's font can't render{" "}
            {unsupported.slice(0, 12).map((c) => `"${c}"`).join(", ")}
            {unsupported.length > 12 ? " …" : ""}. Those characters will be left out of the PDF.
          </AlertDescription>
        </Alert>
      )}
```

- [ ] **Step 5: Run the App tests to verify they pass**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: all App tests pass, including the new dismissable-error test. (The sample résumé is Latin-only, so `unsupported` is empty and only the error Alert carries `role="alert"`.)

- [ ] **Step 6: Verify the build**

Run: `pnpm build`
Expected: 0 type errors; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate warning/error bars to shadcn Alert"
```

---

### Task 5: Migrate SchemaForm (Accordion sections, Card items, shadcn controls)

Rewrites `SchemaForm.tsx` so top-level blocks become a shadcn `Accordion` (Basics open, the rest collapsed), list items become `Card`s with an icon remove button and an "Add X" button, and fields use shadcn `Label`/`Input`/`Textarea`. Behavior (immutable edits via `update.ts`, split/join for string lists) is preserved.

**Files:**
- Modify: `src/forms/SchemaForm.tsx` (full rewrite)
- Test: `src/forms/SchemaForm.test.tsx` (update for accordion + new control markup)

**Interfaces:**
- Consumes: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`, `Button`, `Card`, `Input`, `Label`, `Textarea` from `@/components/ui/*`; `Plus`/`Trash2` from `lucide-react`; `addItem`/`removeItem`/`updateItem` from `./update`. Schema node types (`Block`, `FieldNode`, `FieldSpec`, `LeafField`, `FormSchema`) from `./schema` — unchanged.
- Produces: `SchemaForm<T>({ schema, data, onChange })` — same public signature as today.
- Behavior contract preserved: editing a leaf calls `onChange` with a new object where only that key changed; "Add" appends `makeItem()` with a fresh id; the remove button's accessible name is `Remove {block.title} {n}`; the add button's accessible name is `Add {block.title}`.

- [ ] **Step 1: Update the SchemaForm tests for the accordion + new controls**

Replace the contents of `src/forms/SchemaForm.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { builder, type FormSchema } from "./schema";
import { SchemaForm } from "./SchemaForm";

interface Demo {
  name: string;
  contact: { email: string };
  skills: string[];
  items: { id: string; label: string }[];
}

const b = builder<Demo>();
const schema: FormSchema<Demo> = [
  b.section("Basics", [
    b.field("name", "Full name"),
    b.group("contact", (c) => [c.field("email", "Email")]),
    b.tags("skills", "Skills"),
  ]),
  b.list("items", "Items", () => ({ label: "New" }), (it) => [it.field("label", "Label")]),
];

const base: Demo = {
  name: "Ann",
  contact: { email: "a@x.com" },
  skills: ["ts", "go"],
  items: [{ id: "i1", label: "One" }],
};

/** The "Items" list is the 2nd top-level block, collapsed by default. */
function expandItems() {
  fireEvent.click(screen.getByRole("button", { name: "Items" }));
}

describe("SchemaForm", () => {
  it("renders section triggers; Basics is open, lists are collapsed", () => {
    render(<SchemaForm schema={schema} data={base} onChange={() => {}} />);
    // Accordion triggers (always rendered):
    expect(screen.getByRole("button", { name: "Basics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Items" })).toBeInTheDocument();
    // Basics content is open:
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    // Items content is collapsed (not mounted) until expanded:
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
    expandItems();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("edits a root text field immutably", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Ann"), { target: { value: "Bob" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, name: "Bob" });
  });

  it("edits a nested group field", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("a@x.com"), { target: { value: "b@y.com" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, contact: { email: "b@y.com" } });
  });

  it("joins and splits a stringList losslessly", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("ts,go"), { target: { value: "ts,go,rust" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, skills: ["ts", "go", "rust"] });
  });

  it("adds an array item with a fresh id", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    expandItems();
    fireEvent.click(screen.getByRole("button", { name: /add items/i }));
    const next = onChange.mock.calls[0][0] as Demo;
    expect(next.items.length).toBe(2);
    expect(next.items[1].label).toBe("New");
    expect(typeof next.items[1].id).toBe("string");
  });

  it("removes an array item", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    expandItems();
    fireEvent.click(screen.getByRole("button", { name: "Remove Items 1" }));
    expect(onChange).toHaveBeenCalledWith({ ...base, items: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/forms/SchemaForm.test.tsx`
Expected: FAIL — the current form has no accordion triggers (no `button` named "Items"), so `expandItems()` and the trigger queries throw.

- [ ] **Step 3: Rewrite `SchemaForm.tsx`**

Replace the entire contents of `src/forms/SchemaForm.tsx` with:

```tsx
import type { ReactNode } from "react";
import type { Block, FieldNode, FieldSpec, FormSchema, LeafField } from "./schema";
import { addItem, removeItem, updateItem } from "./update";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

type Obj = Record<string, any>;
type Item = Obj & { id: string };

/** Label wraps its control (a real <label>), so clicking the text focuses the
   field and screen readers announce it — no id/htmlFor wiring needed. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="mb-3 flex flex-col items-start gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </Label>
  );
}

function Control({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (spec.control === "textarea") {
    return (
      <Textarea
        rows={spec.rows}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (spec.control === "stringList") {
    // Lossless: join on the separator for display, split on the same separator
    // on edit. Split/join are exact inverses, so no caret jumps.
    const text = Array.isArray(value) ? value.join(spec.separator) : "";
    const handle = (s: string) => onChange(s.split(spec.separator));
    return spec.multiline ? (
      <Textarea rows={spec.rows} value={text} onChange={(e) => handle(e.target.value)} />
    ) : (
      <Input value={text} onChange={(e) => handle(e.target.value)} />
    );
  }
  return (
    <Input
      value={(value as string) ?? ""}
      placeholder={spec.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Leaf({
  node,
  value,
  onChange,
}: {
  node: LeafField;
  value: Obj;
  onChange: (next: Obj) => void;
}) {
  return (
    <Field label={node.label}>
      <Control
        spec={node.spec}
        value={value[node.key]}
        onChange={(v) => onChange({ ...value, [node.key]: v })}
      />
    </Field>
  );
}

function Nodes({
  nodes,
  value,
  onChange,
}: {
  nodes: FieldNode[];
  value: Obj;
  onChange: (next: Obj) => void;
}) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "field") {
          return <Leaf key={i} node={node} value={value} onChange={onChange} />;
        }
        if (node.kind === "row") {
          return (
            <div className="grid grid-cols-2 gap-3" key={i}>
              {node.fields.map((f, j) => (
                <Leaf key={j} node={f} value={value} onChange={onChange} />
              ))}
            </div>
          );
        }
        // group: render children against the nested sub-object scope.
        const sub = (value[node.key] ?? {}) as Obj;
        return (
          <Nodes
            key={i}
            nodes={node.children}
            value={sub}
            onChange={(next) => onChange({ ...value, [node.key]: next })}
          />
        );
      })}
    </>
  );
}

function ArrayItems({
  block,
  data,
  onChange,
}: {
  block: Extract<Block, { kind: "array" }>;
  data: Obj;
  onChange: (next: Obj) => void;
}) {
  const items = (data[block.key] ?? []) as Item[];
  const setItems = (next: Item[]) => onChange({ ...data, [block.key]: next });
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Card key={item.id} className="gap-0 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setItems(removeItem(items, item.id))}
              aria-label={`Remove ${block.title} ${i + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Nodes
            nodes={block.itemChildren}
            value={item}
            onChange={(next) => setItems(updateItem(items, item.id, next as Item))}
          />
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setItems(addItem(items, block.makeItem()))}
      >
        <Plus className="size-4" /> Add {block.title}
      </Button>
    </div>
  );
}

/**
 * Generic, schema-driven editor. Each top-level block (section or list) is an
 * accordion panel; the first (Basics) is open by default. Editing emits a new
 * immutable data object via the helpers in ./update.
 */
export function SchemaForm<T>({
  schema,
  data,
  onChange,
}: {
  schema: FormSchema<T>;
  data: T;
  onChange: (next: T) => void;
}) {
  const value = data as Obj;
  const setValue = onChange as unknown as (next: Obj) => void;
  const blocks = schema as Block[];
  return (
    <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
      <Accordion type="multiple" defaultValue={["section-0"]}>
        {blocks.map((block, i) => (
          <AccordionItem key={i} value={`section-${i}`}>
            <AccordionTrigger>{block.title}</AccordionTrigger>
            <AccordionContent>
              {block.kind === "array" ? (
                <ArrayItems block={block} data={value} onChange={setValue} />
              ) : (
                <Nodes nodes={block.children} value={value} onChange={setValue} />
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </form>
  );
}
```

- [ ] **Step 4: Run the SchemaForm tests to verify they pass**

Run: `pnpm exec vitest run src/forms/SchemaForm.test.tsx`
Expected: all 6 tests pass.

- [ ] **Step 5: Run the full suite + build**

Run: `pnpm test`
Expected: every test passes (App test 1 still finds "Basics" as a trigger and the name input in the open Basics panel; `getAllByText("Experience")` still matches the collapsed Experience trigger plus the preview heading).

Run: `pnpm build`
Expected: 0 type errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate schema editor form to shadcn Accordion + Card + controls"
```

---

### Task 6: Remove dead chrome CSS + final verification

Deletes the now-unused chrome rules from `index.css` (keeping the layout shell + skeleton + preview-stage rules), then runs the full verification including the PDF forensic gate and a template-untouched check.

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nothing new. This task only removes CSS that no element references anymore.

- [ ] **Step 1: Trim `index.css` to the shell + preview-stage rules**

Replace the entire contents of `src/index.css` with:

```css
:root {
  --app-bg: #eef0f4;
  --panel-bg: #ffffff;
  --panel-border: #e2e5ec;
  --text: #1b1b1f;
  --text-muted: #61636b;
  --shadow: 0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 24px rgba(16, 24, 40, 0.08);
  font-family: "Inter", system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  margin: 0;
}

body {
  background: var(--app-bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

/* ---- App shell ------------------------------------------------------- */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ---- Static pre-hydration skeleton (Astro shell) -------------------- */
.app-skeleton {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  text-align: center;
  background: var(--app-bg);
}
.app-skeleton h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.app-skeleton p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}
.app-skeleton__hint {
  margin-top: 8px;
  opacity: 0.8;
}

/* ---- Two-pane layout ------------------------------------------------- */
.workspace {
  display: grid;
  grid-template-columns: minmax(360px, 460px) 1fr;
  flex: 1;
  min-height: 0;
}
@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, 1fr);
  }
}

.editor {
  overflow-y: auto;
  padding: 20px 22px 60px;
  border-right: 1px solid var(--panel-border);
  background: var(--panel-bg);
}

/* ---- Preview pane ---------------------------------------------------- */
.preview {
  overflow: auto;
  /* Reserve the scrollbar gutter so toggling the scrollbar never changes the
     measured width (prevents a ResizeObserver/scrollbar feedback loop). */
  scrollbar-gutter: stable;
  padding: 28px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.page-frame {
  box-shadow: var(--shadow);
  background: #fff;
  flex: none;
}
.page-scaler {
  transform-origin: top left;
}
```

- [ ] **Step 2: Verify the full suite still passes**

Run: `pnpm test`
Expected: all tests pass (no element referenced the removed `.btn`/`.field`/`.form-section`/`.card`/`.warning-bar`/`.topbar` rules after Tasks 3–5).

- [ ] **Step 3: Verify the production build**

Run: `pnpm build`
Expected: `astro check` 0 errors; build succeeds.

- [ ] **Step 4: Visual smoke check in the production preview**

Run: `pnpm preview`, open the URL. Confirm: topbar uses shadcn Button/Select; sections are an accordion with Basics open; expanding Experience/Education/Skills shows item Cards with a trash button and an "Add …" button; editing a field updates the live preview. Switch the document-type select (only "Résumé" exists) and click "Reset sample". Keep `preview` running for Step 5.

- [ ] **Step 5: PDF forensic gate (final)**

Click **Download PDF**, save as `resume.pdf` (overwrite), then:

```bash
node scripts/inspect-pdf.mjs resume.pdf
pdffonts resume.pdf
pdftotext resume.pdf -
```

Expected: same verdict as the Task 1 baseline — single page; `Inter` + `SourceSerif` `emb yes ... uni yes`; zero `/Image`; selectable text matching the résumé; header (name/headline/contact) stacked at `x=56`. Stop `preview`.

- [ ] **Step 6: Confirm the template layer is untouched**

Run:

```bash
git diff --stat HEAD~5 -- src/templates/classic/ClassicPreview.tsx src/templates/classic/classic.css src/theme/theme.ts
```

Expected: **no output** (zero changes to those three files across the migration commits). If anything appears, revert those hunks before finishing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove dead chrome CSS after shadcn migration"
```

---

## Self-Review

**Spec coverage:**
- Scope = chrome only, template/`theme.ts` untouched → Task 6 Step 6 asserts it; Global Constraints forbid it. ✓
- shadcn `new-york`/`neutral`, light only → Task 2 `components.json` + tokens (no `.dark` triggered). ✓
- Accordion (Basics open, rest collapsed); list items as Cards → Task 5. ✓
- Incremental + PDF gate → Tasks 1, 2, 6 each run `inspect-pdf.mjs`. ✓
- Tailwind v4 via `@tailwindcss/vite` → Task 1. ✓
- Preview-stage layout stays in CSS → Task 6 keeps `.preview`/`.page-frame`/`.page-scaler`. ✓
- No-Preflight + chrome-scoped reset excluding preview/capture → Task 2 Step 2. ✓
- Chrome migration map (Select, Buttons, Alert, form controls) → Tasks 3–5. ✓
- Reuse `update.ts` verbatim → Task 5 imports it unchanged. ✓
- Tests: schema/update/registry/template/sanity untouched; App + SchemaForm updated → Tasks 3–5. ✓
- Out of scope (dark mode, toasts, token sharing) → not present in any task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content (our files) or an exact CLI command (vendored shadcn components). No "similar to Task N". ✓

**Type/name consistency:** `cn` (Task 1) consumed by generated components (Task 2). `handleDocChange(id: string)` matches `Select onValueChange`. Remove button accessible name `Remove {title} {n}` and add button `Add {title}` are produced in Task 5 and queried with the same strings in its test. Accordion item values `section-0…` with `defaultValue={["section-0"]}` (Basics = block 0) match the "Basics open, Items collapsed" test. `block.title` exists on both `section` and `array` Block variants (per `src/forms/schema.ts`). ✓
