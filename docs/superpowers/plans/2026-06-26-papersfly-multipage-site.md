# papersfly Multi-Page Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single builder-at-`/` resume tool into a small website — a marketing landing page, a `/create` template gallery, and the builder at `/build/[doc]/[template]` — with site-wide dark mode.

**Architecture:** Astro static pages for the landing (`/`) and gallery shell (`/create`); the existing React builder island moves behind a static-param route (`/build/[doc]/[template]`) generated from the document/template registries. A live-rendered `ClassicPreview` (scaled with CSS transform) is the hero showcase on the landing page and the thumbnail in each gallery card. Dark mode is a `.dark` class on `<html>` driven by a no-flash inline script and a shared theme helper.

**Tech Stack:** Astro 5, React 19, TypeScript, Tailwind v4 + shadcn/ui, lucide-react, jsPDF, Vitest + Testing Library (jsdom). Package manager: **pnpm**.

## Global Constraints

- **Project root is `/Users/artazasameen/workshop/pdf-mvp`** (the `vector-resume-builder` Astro app), NOT the `authlayer` shell cwd. Run every command from there.
- **Node `v22.21.1`**, **pnpm** only.
- **Do NOT run git commits — the user handles version control.** Each task ends at a *green checkpoint* (the listed tests/build pass), not a commit.
- **Brand name:** `papersfly` (lowercase wordmark). Theme localStorage key: `papersfly-theme`.
- **Path alias:** `@` → `src` (e.g. `@/lib/utils`). Use relative imports inside the same folder.
- **No new templates, no new real document types.** Only `resume`/`classic` are real. "Soon" doc-type pills and the dashed placeholder card are illustrative only — build no functionality behind them.
- **Hard PDF/paper invariant:** the resume sheet stays white in every theme. No dark-mode rule may target `.resume-page`, `.preview *`, or `.pdf-capture *`. `marketing.css` must use **class selectors only** — never bare `h1/h2/h3/p/ul/li/hr` selectors under `.site` (the hero contains a real `.resume-page`; bare tags would leak into it). The sheet's colors come from `theme.ts` (`--c-*`), a namespace separate from shadcn's `--background`/`--foreground`.
- **Astro dev toolbar stays disabled** (`devToolbar: { enabled: false }` in `astro.config.mjs`) — do not re-enable.
- **Test commands:** single file `pnpm exec vitest run <path>`; whole suite `pnpm exec vitest run`. Full build + typecheck gate: `pnpm build` (runs `astro check` then `astro build`).

---

### Task 1: Routing helpers

**Files:**
- Create: `src/lib/routing.ts`
- Test: `src/lib/routing.test.ts`

**Interfaces:**
- Consumes: `DocumentType<T>` from `src/documents/types.ts` (has `id` and `templates: Template[]`; `Template` has `id`).
- Produces:
  - `builderHref(docId: string, templateId: string): string`
  - `buildBuilderPaths(documents: DocumentType<unknown>[]): { doc: string; template: string }[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/routing.test.ts
import { describe, it, expect } from "vitest";
import { builderHref, buildBuilderPaths } from "./routing";

describe("builderHref", () => {
  it("builds the builder URL from a doc id and template id", () => {
    expect(builderHref("resume", "classic")).toBe("/build/resume/classic");
  });
});

describe("buildBuilderPaths", () => {
  it("emits one entry per template of each document, in order", () => {
    const docs = [
      { id: "resume", templates: [{ id: "classic" }, { id: "modern" }] },
      { id: "invoice", templates: [{ id: "plain" }] },
    ] as never;
    expect(buildBuilderPaths(docs)).toEqual([
      { doc: "resume", template: "classic" },
      { doc: "resume", template: "modern" },
      { doc: "invoice", template: "plain" },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/routing.test.ts`
Expected: FAIL — `Failed to resolve import "./routing"` / `builderHref is not a function`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/routing.ts
import type { DocumentType } from "../documents/types";

/** The builder route for a given document type + template, e.g. /build/resume/classic. */
export function builderHref(docId: string, templateId: string): string {
  return `/build/${docId}/${templateId}`;
}

/**
 * Flatten the registry into one { doc, template } pair per template of each
 * document — the static params for the /build/[doc]/[template] route.
 */
export function buildBuilderPaths(
  documents: DocumentType<unknown>[],
): { doc: string; template: string }[] {
  return documents.flatMap((doc) =>
    doc.templates.map((template) => ({ doc: doc.id, template: template.id })),
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/routing.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Checkpoint (no commit)**

Run: `pnpm exec vitest run src/lib/routing.test.ts` — confirm green. Do NOT commit.

---

### Task 2: Theme helpers

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Produces:
  - `type Theme = "light" | "dark"`
  - `const THEME_KEY = "papersfly-theme"`
  - `resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme`
  - `applyTheme(theme: Theme): void` — toggles `.dark` on `document.documentElement`
  - `toggleTheme(): Theme` — flips the class, persists to `localStorage`, returns the new theme

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/theme.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { resolveInitialTheme, toggleTheme, applyTheme, THEME_KEY } from "./theme";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

describe("resolveInitialTheme", () => {
  it("uses a valid stored value over the system preference", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });
  it("falls back to the system preference when nothing valid is stored", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
    expect(resolveInitialTheme("nonsense", true)).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("adds or removes the dark class on the document root", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("toggleTheme", () => {
  it("flips the theme, persists it, and returns the new value", () => {
    expect(toggleTheme()).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(toggleTheme()).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/theme.ts
export type Theme = "light" | "dark";

/**
 * localStorage key for the user's chosen theme. MUST stay in sync with the
 * inline no-flash snippet in BaseLayout.astro (which hardcodes this string
 * because it runs before any module loads).
 */
export const THEME_KEY = "papersfly-theme";

/** Stored choice wins; otherwise follow the OS preference. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark ? "dark" : "light";
}

/** Reflect a theme onto the document root (the `.dark` class drives all tokens). */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Flip the current theme, persist it, and return the new value. */
export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private-mode / disabled storage: the class still applies for this session.
  }
  return next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/theme.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Checkpoint (no commit)**

Run: `pnpm exec vitest run src/lib/theme.test.ts` — confirm green.

---

### Task 3: React theme toggle (for the builder island)

**Files:**
- Create: `src/components/site/ThemeToggle.tsx`
- Test: `src/components/site/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: `toggleTheme` from `@/lib/theme`.
- Produces: `ThemeToggle` — a React component rendering a `<button>` with accessible name "Toggle dark mode".

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/site/ThemeToggle.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

describe("ThemeToggle (React)", () => {
  it("toggles the dark class on the document root when clicked", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/site/ThemeToggle.test.tsx`
Expected: FAIL — cannot resolve `./ThemeToggle`.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// src/components/site/ThemeToggle.tsx
import { useEffect, useState } from "react";
import { toggleTheme } from "@/lib/theme";

/**
 * Dark-mode toggle for React islands (the builder). An .astro component can't
 * render inside a React island, so this mirrors ThemeToggle.astro's behaviour
 * via the shared lib/theme helpers.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // The no-flash inline script may already have set .dark before hydration.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => setDark(toggleTheme() === "dark")}
      className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/site/ThemeToggle.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Checkpoint (no commit)**

Run: `pnpm exec vitest run src/components/site/ThemeToggle.test.tsx` — confirm green.

---

### Task 4: Dark-mode tokens, no-flash script, and the static theme toggle

**Files:**
- Modify: `src/styles/globals.css` (add `.dark` shadcn token block after the `:root` block)
- Modify: `src/index.css` (add `.dark` app-shell overrides)
- Modify: `src/layouts/BaseLayout.astro` (add no-flash inline `<script>` in `<head>`)
- Create: `src/components/site/ThemeToggle.astro` (static-page toggle)

**Interfaces:**
- Consumes: `THEME_KEY`/helpers conceptually (the inline no-flash script hardcodes `papersfly-theme`; the bundled toggle script imports from `../../lib/theme`).
- Produces: a global `.dark` theme; `ThemeToggle.astro` usable in any `.astro` page/component.

This task has no unit test (CSS + Astro markup). Its gate is `pnpm build` plus the existing suite staying green.

- [ ] **Step 1: Add the shadcn dark tokens to `globals.css`**

Insert this block immediately AFTER the closing `}` of the existing `:root { … }` block (and before `@theme inline`):

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
```

- [ ] **Step 2: Add the app-shell dark overrides to `index.css`**

Append to the end of `src/index.css`:

```css
/* ---- Dark theme (app shell only — the .resume-page sheet stays white) ---- */
.dark {
  --app-bg: #0f141b;
  --panel-bg: #161c26;
  --panel-border: #283041;
  --text: #e7e9ee;
  --text-muted: #a3acba;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

(`.page-frame` and `.resume-page` keep their hardcoded `#fff` — the white sheet floats on the dark preview pane. Do not add dark rules for them.)

- [ ] **Step 3: Add the no-flash inline script to `BaseLayout.astro`**

In `src/layouts/BaseLayout.astro`, inside `<head>`, immediately after the `<meta name="viewport" … />` line, add:

```astro
    <!-- Set the theme before first paint so there is no light→dark flash.
         Hardcodes the key from src/lib/theme.ts (THEME_KEY) since this runs
         before any module loads. -->
    <script is:inline>
      (function () {
        try {
          var stored = localStorage.getItem("papersfly-theme");
          var dark = stored
            ? stored === "dark"
            : window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (dark) document.documentElement.classList.add("dark");
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 4: Create the static theme toggle**

```astro
---
// src/components/site/ThemeToggle.astro
// Dark-mode toggle for static pages (/ and /create). Operates on the document
// root via the shared lib/theme helpers; the bundled <script> below imports them.
---
<button type="button" id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
  <svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </svg>
  <svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
</button>

<script>
  import { toggleTheme, applyTheme, resolveInitialTheme, getStoredTheme } from "../../lib/theme";
  // Sync the icon with the resolved initial theme (no-flash script set the class).
  applyTheme(resolveInitialTheme(getStoredTheme(), document.documentElement.classList.contains("dark")));
  const btn = document.getElementById("theme-toggle");
  btn?.addEventListener("click", () => toggleTheme());
</script>
```

- [ ] **Step 5: Add `getStoredTheme` to `lib/theme.ts`**

The toggle script above uses `getStoredTheme`. Add it to `src/lib/theme.ts`:

```ts
/** Read the persisted theme, tolerating disabled storage. */
export function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Build and verify**

Run: `pnpm build`
Expected: build succeeds (astro check passes, `dist/` produced).
Run: `pnpm exec vitest run`
Expected: all existing tests still PASS.

- [ ] **Step 7: Checkpoint (no commit)**

Confirm `pnpm build` and `pnpm exec vitest run` are both green.

---

### Task 5: Route the builder — `App` takes `docId`/`templateId`, new header

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `documents`, `defaultDocument` from `./documents/registry`; `ThemeToggle` from `@/components/site/ThemeToggle`.
- Produces: `App({ docId?: string; templateId?: string })` — props are OPTIONAL and fall back to `defaultDocument` / its first template, so `<App />` still renders (keeps `index.astro` valid until Task 11).

- [ ] **Step 1: Update the tests first (red)**

In `src/App.test.tsx`:

(a) Change EVERY `render(<App />)` to `render(<App docId="resume" templateId="classic" />)` (4 occurrences: the editor test, the selector test you're about to replace, the error-alert test, the preload test).

(b) DELETE the test `it("shows a document-type selector defaulting to the resume", …)` entirely and replace it with:

```tsx
  it("shows a back link to the gallery and the active document · template", async () => {
    render(<App docId="resume" templateId="classic" />);
    const back = screen.getByRole("link", { name: /templates/i });
    expect(back).toHaveAttribute("href", "/create");
    const title = screen.getByTestId("builder-title");
    expect(title).toHaveTextContent("resume");
    expect(title).toHaveTextContent("Classic");
    // No document-type dropdown anymore.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    // Flush the lazy preview so its resolution is wrapped in act().
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL — back link / `builder-title` not found; combobox still present.

- [ ] **Step 3: Update `App.tsx` — props + resolution**

Replace the imports for the doc-type `<select>` and wire the new ones. Remove:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

Add (near the other imports):

```tsx
import { ThemeToggle } from "@/components/site/ThemeToggle";
```

Change the component signature and the doc/template/data setup. Replace:

```tsx
export function App() {
  const [docId, setDocId] = useState<string>(defaultDocument.id);
  const doc = useMemo(
    () => documents.find((d) => d.id === docId) ?? defaultDocument,
    [docId],
  );
  const [data, setData] = useState<any>(defaultDocument.defaultData);
  const template = doc.templates[0];
  const Preview = template.Preview; // lazy — rendered behind <Suspense> below

  const handleDocChange = (id: string) => {
    const next = documents.find((d) => d.id === id) ?? defaultDocument;
    setDocId(next.id);
    setData(next.defaultData); // load that type's seed content
  };
```

with:

```tsx
interface AppProps {
  /** Document type id from the route; falls back to the default document. */
  docId?: string;
  /** Template id from the route; falls back to the document's first template. */
  templateId?: string;
}

export function App({ docId, templateId }: AppProps) {
  const doc = useMemo(
    () => documents.find((d) => d.id === docId) ?? defaultDocument,
    [docId],
  );
  const template = useMemo(
    () => doc.templates.find((t) => t.id === templateId) ?? doc.templates[0],
    [doc, templateId],
  );
  const [data, setData] = useState<any>(() => doc.defaultData);
  const Preview = template.Preview; // lazy — rendered behind <Suspense> below
```

(`useMemo` is already imported. `setDocId`/`handleDocChange` are removed.)

- [ ] **Step 4: Update `App.tsx` — the header JSX**

Replace the entire `<header>…</header>` block with:

```tsx
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="/create"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Templates
          </a>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <h1 data-testid="builder-title" className="truncate text-sm font-bold tracking-tight">
            {doc.name}
            <span className="font-medium text-muted-foreground"> · {template.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Button variant="ghost" onClick={handleReset}>
            Reset sample
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : "↓ Download PDF"}
          </Button>
        </div>
      </header>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS (all tests, including the new back-link/title test).

- [ ] **Step 6: Typecheck the whole app**

Run: `pnpm build`
Expected: succeeds (no TS errors from the removed `Select` / changed props; `<App />` in `index.astro` is still valid because props are optional).

- [ ] **Step 7: Checkpoint (no commit)**

Confirm `pnpm exec vitest run src/App.test.tsx` and `pnpm build` are green.

---

### Task 6: Builder route — `/build/[doc]/[template]`

**Files:**
- Create: `src/pages/build/[doc]/[template].astro`

**Interfaces:**
- Consumes: `buildBuilderPaths` from `../../../lib/routing`; `documents` from `../../../documents/registry`; `App` from `../../../App`; `BaseLayout` from `../../../layouts/BaseLayout.astro`.
- Produces: a static page per `(doc, template)` pair that mounts `<App docId templateId />`.

Gate: build output (no vitest for `.astro`).

- [ ] **Step 1: Create the route**

```astro
---
// src/pages/build/[doc]/[template].astro
import BaseLayout from "../../../layouts/BaseLayout.astro";
import { App } from "../../../App";
import { documents } from "../../../documents/registry";
import { buildBuilderPaths } from "../../../lib/routing";

export function getStaticPaths() {
  return buildBuilderPaths(documents).map(({ doc, template }) => ({
    params: { doc, template },
  }));
}

const { doc, template } = Astro.params;

const docName = documents.find((d) => d.id === doc)?.name ?? "Document";
const title = `${docName} builder — papersfly`;
const description =
  "Build your document in the browser and export a true-vector PDF. 100% client-side, works offline, no signup.";
---

<BaseLayout title={title} description={description}>
  {/* The builder is browser-only (jsPDF + live layout measurement); this static
      skeleton gives an instant paint and is removed when the React app mounts. */}
  <div id="app-skeleton" class="app-skeleton">
    <h1>papersfly</h1>
    <p>Live preview · true-vector PDF · 100% offline</p>
    <p class="app-skeleton__hint">Loading the editor…</p>
  </div>

  <App client:only="react" docId={doc} templateId={template} />
</BaseLayout>

<script is:inline>
  // Remove the static skeleton as soon as the React app (.app) mounts.
  const skeleton = document.getElementById("app-skeleton");
  if (skeleton) {
    const obs = new MutationObserver(() => {
      if (document.querySelector(".app")) {
        skeleton.remove();
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
</script>
```

- [ ] **Step 2: Build and verify the page is generated**

Run: `pnpm build`
Expected: succeeds.
Run: `test -f dist/build/resume/classic/index.html && echo BUILDER_PAGE_OK`
Expected: prints `BUILDER_PAGE_OK`.

- [ ] **Step 3: Verify the builder still works at the new URL (manual)**

Run: `pnpm preview` and open `http://localhost:4321/build/resume/classic`. Confirm the editor + live preview render and Download produces a PDF. (`pnpm preview` is the source of truth for PDF output.) Stop the server when done.

- [ ] **Step 4: Checkpoint (no commit)**

Confirm `pnpm build` is green and `dist/build/resume/classic/index.html` exists.

---

### Task 7: Template description + `TemplateCard`

**Files:**
- Modify: `src/templates/types.ts` (add optional `description`)
- Modify: `src/templates/lazyTemplate.ts` (thread `description` through `meta`)
- Modify: `src/templates/classic/index.ts` (set the description)
- Create: `src/components/create/TemplateCard.tsx`
- Test: `src/components/create/TemplateCard.test.tsx`

**Interfaces:**
- Consumes: `Template` from `@/templates/types`; `builderHref` from `@/lib/routing`.
- Produces: `TemplateCard({ docId: string; template: Template; data: unknown })` — an `<a>` to `builderHref(docId, template.id)` containing a scaled live preview + the template name/description.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/create/TemplateCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateCard } from "./TemplateCard";
import { classicTemplate } from "@/templates/classic";
import { sampleResume } from "@/data/resume";

describe("TemplateCard", () => {
  it("links to the builder for its doc + template and shows the name", async () => {
    render(<TemplateCard docId="resume" template={classicTemplate} data={sampleResume} />);
    const link = screen.getByRole("link", { name: /classic/i });
    expect(link).toHaveAttribute("href", "/build/resume/classic");
    expect(screen.getByText("Classic")).toBeInTheDocument();
    // The lazy preview resolves and renders the sample resume inside the card.
    expect(await screen.findByText("Jordan Avery Chen")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/create/TemplateCard.test.tsx`
Expected: FAIL — cannot resolve `./TemplateCard`.

- [ ] **Step 3: Add `description` to the template model**

In `src/templates/types.ts`, add to the `Template` interface (after `name`):

```ts
  /** Short one-line design description, shown on the gallery card. */
  description?: string;
```

In `src/templates/lazyTemplate.ts`, change the `meta` parameter type and the returned object:

```ts
export function lazyTemplate(
  meta: { id: string; name: string; description?: string },
  load: () => Promise<PreviewModule>,
): Template {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    Preview: lazy(load),
    preload: () => load().then((m) => m.default),
  };
}
```

In `src/templates/classic/index.ts`, add the description to the meta:

```ts
export const classicTemplate = lazyTemplate(
  { id: "classic", name: "Classic", description: "Single-column, editorial serif" },
  () => import("./ClassicPreview"),
);
```

- [ ] **Step 4: Write the `TemplateCard` implementation**

```tsx
// src/components/create/TemplateCard.tsx
import { Suspense } from "react";
import type { Template } from "@/templates/types";
import { builderHref } from "@/lib/routing";

/**
 * One gallery card: a scaled-down LIVE render of the template (the same
 * component used in the builder, behind <Suspense> so its chunk stays split),
 * linking to the builder for this doc + template.
 */
export function TemplateCard({
  docId,
  template,
  data,
}: {
  docId: string;
  template: Template;
  data: unknown;
}) {
  const Preview = template.Preview;
  return (
    <a className="tmpl-card" href={builderHref(docId, template.id)}>
      <div className="tmpl-thumb">
        <div className="tmpl-thumb-scale">
          <Suspense fallback={<div className="tmpl-thumb-skeleton" aria-hidden="true" />}>
            {/* data is the document's defaultData; its shape matches the template. */}
            <Preview data={data as never} />
          </Suspense>
        </div>
      </div>
      <div className="tmpl-meta">
        <div>
          <h3 className="tmpl-name">{template.name}</h3>
          {template.description && <p className="tmpl-desc">{template.description}</p>}
        </div>
        <span className="tmpl-use">
          Use
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </div>
    </a>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/create/TemplateCard.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Re-run the affected suites**

Run: `pnpm exec vitest run src/templates`
Expected: PASS (the existing classic/template tests still pass with the new `description`).

- [ ] **Step 7: Checkpoint (no commit)**

Confirm the TemplateCard test and `src/templates` tests are green.

---

### Task 8: `CreateGallery` island

**Files:**
- Create: `src/components/create/CreateGallery.tsx`
- Test: `src/components/create/CreateGallery.test.tsx`

**Interfaces:**
- Consumes: `documents` from `@/documents/registry` (default); `TemplateCard` from `./TemplateCard`; `DocumentType` from `@/documents/types`.
- Produces: `CreateGallery({ documents?: DocumentType<unknown>[] })` — `documents` is injectable for testing and defaults to the registry. Renders a pill per document + illustrative "Soon" pills, and a `TemplateCard` per template of the selected document + a dashed placeholder.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/create/CreateGallery.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CreateGallery } from "./CreateGallery";
import { classicTemplate } from "@/templates/classic";
import { sampleResume } from "@/data/resume";

// Two fake docs so we can assert doc-type switching swaps the cards.
const fakeDocs = [
  { id: "resume", name: "resume", schema: {}, defaultData: sampleResume, templates: [classicTemplate] },
  { id: "letter", name: "Cover letter", schema: {}, defaultData: sampleResume, templates: [{ ...classicTemplate, id: "formal", name: "Formal" }] },
] as never;

describe("CreateGallery", () => {
  it("shows a pill per document and the selected document's template cards", async () => {
    render(<CreateGallery documents={fakeDocs} />);
    expect(screen.getByRole("button", { name: "resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cover letter" })).toBeInTheDocument();
    // Default selection = first doc → its Classic card links to the builder.
    const card = screen.getByRole("link", { name: /classic/i });
    expect(card).toHaveAttribute("href", "/build/resume/classic");
  });

  it("swaps the cards when a different document type is selected", () => {
    render(<CreateGallery documents={fakeDocs} />);
    fireEvent.click(screen.getByRole("button", { name: "Cover letter" }));
    const card = screen.getByRole("link", { name: /formal/i });
    expect(card).toHaveAttribute("href", "/build/letter/formal");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/create/CreateGallery.test.tsx`
Expected: FAIL — cannot resolve `./CreateGallery`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/create/CreateGallery.tsx
import { useState } from "react";
import type { DocumentType } from "@/documents/types";
import { documents as registryDocuments } from "@/documents/registry";
import { TemplateCard } from "./TemplateCard";

/**
 * Illustrative-only document types. They communicate that the picker will hold
 * more kinds later; they are NOT selectable and nothing is built behind them.
 */
const COMING_SOON_TYPES = ["Cover letter", "Invoice"];

export function CreateGallery({
  documents = registryDocuments,
}: {
  documents?: DocumentType<unknown>[];
}) {
  const [selectedId, setSelectedId] = useState(documents[0]?.id);
  const selected = documents.find((d) => d.id === selectedId) ?? documents[0];

  return (
    <div className="gallery">
      <div className="picker-label">Document type</div>
      <div className="pills">
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className={`pill${doc.id === selected.id ? " active" : ""}`}
            onClick={() => setSelectedId(doc.id)}
          >
            {doc.name}
          </button>
        ))}
        {COMING_SOON_TYPES.map((label) => (
          <span key={label} className="pill soon" aria-disabled="true">
            {label} <span className="tag">Soon</span>
          </span>
        ))}
      </div>

      <p className="tmpl-label">
        <b>
          {selected.templates.length} template{selected.templates.length === 1 ? "" : "s"}
        </b>{" "}
        for {selected.name} — click to start building
      </p>
      <div className="tmpl-cards">
        {selected.templates.map((template) => (
          <TemplateCard
            key={template.id}
            docId={selected.id}
            template={template}
            data={selected.defaultData}
          />
        ))}
        <div className="tmpl-card-soon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>More templates coming</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/create/CreateGallery.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Checkpoint (no commit)**

Confirm the CreateGallery test is green.

---

### Task 9: Marketing styles + site chrome (`marketing.css`, `SiteHeader`, `SiteFooter`)

**Files:**
- Create: `src/styles/marketing.css`
- Create: `src/components/site/SiteHeader.astro`
- Create: `src/components/site/SiteFooter.astro`

**Interfaces:**
- Consumes: `ThemeToggle.astro` (Task 4).
- Produces: shared CSS classes (`.site`, `.nav`, `.btn`, `.hero`, `.trust`, `.steps`, `.foot`, `.gallery`, `.pill`, `.tmpl-*`) and two reusable Astro components.

Gate: `pnpm build` (these are consumed by Tasks 10–11; no standalone render test).

- [ ] **Step 1: Create `marketing.css`**

> REMINDER (Global Constraints): class selectors ONLY. The hero embeds a real `.resume-page`; never write bare `h1/h2/h3/p/ul/li/hr` rules under `.site`.

```css
/* Marketing + gallery styles for papersfly. Imported by index.astro and
   create.astro (and the site chrome components). Light values live on .site;
   dark values come from `.dark .site` (the .dark class sits on <html>). */

.site {
  --navy: #1f3a5f;
  --navy-hi: #2a4d7a;
  --on-navy: #ffffff;
  --ink: #1b1b1f;
  --muted: #54565c;
  --faint: #83858c;
  --rule: #e2e5ec;
  --ground: #eef0f4;
  --surface: #ffffff;
  --surface-2: #f6f7f9;
  --accent-soft: rgba(31, 58, 95, 0.08);
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06), 0 4px 14px rgba(16, 24, 40, 0.07);
  --shadow-lg: 0 2px 6px rgba(16, 24, 40, 0.08), 0 24px 60px rgba(16, 24, 40, 0.16);
  --f-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-serif: "SourceSerif", Georgia, "Times New Roman", serif;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--f-sans);
  -webkit-font-smoothing: antialiased;
}
.dark .site {
  --navy: #4f80c2;
  --navy-hi: #6a97d3;
  --on-navy: #0f141b;
  --ink: #e7e9ee;
  --muted: #a3acba;
  --faint: #6f7886;
  --rule: #283041;
  --ground: #0f141b;
  --surface: #161c26;
  --surface-2: #131922;
  --accent-soft: rgba(79, 128, 194, 0.14);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 14px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.5), 0 30px 70px rgba(0, 0, 0, 0.6);
}

.site * { box-sizing: border-box; }
.site img { max-width: 100%; }
.site :focus-visible { outline: 2px solid var(--navy); outline-offset: 2px; border-radius: 4px; }

.wrap { max-width: 1120px; margin: 0 auto; padding: 0 28px; }

/* ---- nav ---- */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 17px; letter-spacing: -0.01em; color: var(--ink); text-decoration: none; }
.brand .mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--navy); color: var(--on-navy); }
.brand .mark svg { width: 17px; height: 17px; }
.nav-links { display: flex; align-items: center; gap: 26px; }
.nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; }
.nav-links a:hover { color: var(--ink); }
.nav-right { display: flex; align-items: center; gap: 12px; }

.theme-toggle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: pointer; border: 1px solid var(--rule); background: var(--surface); color: var(--ink); border-radius: 9px; }
.theme-toggle .icon-sun { display: none; }
.dark .theme-toggle .icon-sun { display: block; }
.dark .theme-toggle .icon-moon { display: none; }

/* ---- buttons ---- */
.btn { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; font-size: 15px; line-height: 1; padding: 13px 20px; border-radius: 10px; border: 1px solid transparent; text-decoration: none; transition: background 0.15s, transform 0.15s; }
.btn-primary { background: var(--navy); color: var(--on-navy); box-shadow: var(--shadow-sm); }
.btn-primary:hover { background: var(--navy-hi); transform: translateY(-1px); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--rule); }
.btn-ghost:hover { background: var(--surface-2); }
.btn-sm { padding: 9px 14px; font-size: 13px; border-radius: 8px; }

/* ---- hero ---- */
.hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center; padding: 40px 0 76px; }
.eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--navy); margin-bottom: 22px; }
.eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--navy); }
.hero-title { font-family: var(--f-serif); font-weight: 700; color: var(--ink); font-size: clamp(2.5rem, 4.6vw, 3.75rem); line-height: 1.04; letter-spacing: -0.02em; margin: 0 0 20px; text-wrap: balance; }
.hero-title .accent { color: var(--navy); }
.hero-lede { font-size: 1.12rem; line-height: 1.62; color: var(--muted); margin: 0 0 30px; max-width: 34ch; }
.cta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.cta-note { margin: 20px 0 0; font-size: 13px; color: var(--faint); display: flex; align-items: center; gap: 8px; }
.cta-note .dotsep { width: 3px; height: 3px; border-radius: 50%; background: var(--faint); display: inline-block; }

.showcase { position: relative; display: flex; justify-content: center; }
.showcase .chip { position: absolute; z-index: 3; left: -14px; bottom: 30px; display: inline-flex; align-items: center; gap: 8px; background: var(--surface); color: var(--ink); border: 1px solid var(--rule); padding: 9px 13px; border-radius: 999px; box-shadow: var(--shadow-sm); font-size: 12.5px; font-weight: 600; }
.showcase .chip svg { width: 15px; height: 15px; color: var(--navy); }
/* clip + scale the real .resume-page into a hero-sized sheet */
.hero-showcase { width: 392px; height: 506px; overflow: hidden; box-shadow: var(--shadow-lg); background: #fff; flex: none; }
.hero-showcase .resume-page { transform: scale(0.48); transform-origin: top left; }

/* ---- sections ---- */
.section { padding: 76px 0; }
.section-alt { background: var(--surface); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.sec-head { max-width: 620px; margin-bottom: 44px; }
.sec-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--navy); }
.sec-title { font-family: var(--f-serif); font-weight: 700; font-size: clamp(1.7rem, 3vw, 2.3rem); line-height: 1.12; letter-spacing: -0.015em; color: var(--ink); margin: 14px 0 0; text-wrap: balance; }
.sec-sub { font-size: 1.05rem; line-height: 1.6; color: var(--muted); margin: 14px 0 0; }

.trust { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.t-card { background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; padding: 26px 24px; box-shadow: var(--shadow-sm); }
.dark .section-alt .t-card { background: var(--surface-2); }
.t-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 11px; background: var(--accent-soft); color: var(--navy); margin-bottom: 18px; }
.t-icon svg { width: 22px; height: 22px; }
.t-title { font-size: 1.06rem; font-weight: 600; color: var(--ink); margin: 0 0 8px; letter-spacing: -0.01em; }
.t-text { font-size: 0.95rem; line-height: 1.58; color: var(--muted); margin: 0; }

.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
.step-num { font-family: var(--f-serif); font-weight: 700; font-size: 2.4rem; color: var(--navy); line-height: 1; }
.step-bar { height: 1px; background: var(--rule); margin: 16px 0; }
.step-title { font-size: 1.08rem; font-weight: 600; color: var(--ink); margin: 0 0 8px; letter-spacing: -0.01em; }
.step-text { font-size: 0.95rem; line-height: 1.58; color: var(--muted); margin: 0; }

/* ---- footer ---- */
.foot { background: var(--surface); border-top: 1px solid var(--rule); padding: 40px 0; }
.foot-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.foot-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--navy); background: var(--accent-soft); padding: 7px 13px; border-radius: 999px; }
.foot-badge svg { width: 14px; height: 14px; }
.foot-note { color: var(--faint); font-size: 13px; }

/* ---- create / gallery ---- */
.create-head { padding: 36px 0 8px; }
.create-title { font-family: var(--f-serif); font-weight: 700; font-size: clamp(1.9rem, 3.4vw, 2.5rem); letter-spacing: -0.02em; color: var(--ink); margin: 0 0 10px; }
.create-sub { font-size: 1.05rem; color: var(--muted); margin: 0; max-width: 54ch; line-height: 1.55; }
.gallery { padding-bottom: 40px; }
.picker-label { font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); margin: 40px 0 14px; }
.pills { display: flex; gap: 10px; flex-wrap: wrap; }
.pill { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; font: inherit; font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--rule); background: var(--surface); color: var(--muted); }
.pill.active { background: var(--navy); border-color: var(--navy); color: var(--on-navy); }
.pill.soon { cursor: default; opacity: 0.6; }
.pill.soon .tag { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--faint); background: var(--surface-2); padding: 2px 6px; border-radius: 5px; }

.tmpl-label { font-size: 13px; color: var(--faint); margin: 34px 0 16px; }
.tmpl-label b { color: var(--ink); font-weight: 600; }
.tmpl-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 22px; }

.tmpl-card { display: block; text-align: left; cursor: pointer; background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); text-decoration: none; transition: transform 0.16s, box-shadow 0.16s, border-color 0.16s; }
.tmpl-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); border-color: color-mix(in srgb, var(--navy) 40%, var(--rule)); }
.tmpl-thumb { position: relative; height: 252px; background: var(--surface-2); display: flex; justify-content: center; padding-top: 16px; overflow: hidden; }
.tmpl-thumb-scale { width: 234px; flex: none; }
.tmpl-thumb-scale .resume-page { transform: scale(0.2867); transform-origin: top center; } /* 816px * 0.2867 ≈ 234px */
.tmpl-thumb-skeleton { width: 234px; height: 320px; background: var(--surface); }
.tmpl-thumb::after { content: ""; position: absolute; inset: auto 0 0 0; height: 64px; background: linear-gradient(to top, var(--surface-2), transparent); }
.tmpl-meta { padding: 15px 17px 17px; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; border-top: 1px solid var(--rule); }
.tmpl-name { font-size: 1.02rem; font-weight: 600; color: var(--ink); margin: 0 0 4px; letter-spacing: -0.01em; }
.tmpl-desc { font-size: 0.85rem; color: var(--muted); margin: 0; line-height: 1.4; }
.tmpl-use { flex: none; display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--navy); opacity: 0; transform: translateX(-4px); transition: opacity 0.16s, transform 0.16s; white-space: nowrap; }
.tmpl-card:hover .tmpl-use { opacity: 1; transform: translateX(0); }

.tmpl-card-soon { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 252px; border: 1.5px dashed var(--rule); border-radius: 14px; color: var(--faint); text-align: center; padding: 20px; }
.tmpl-card-soon span { font-size: 13px; font-weight: 500; }

@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; gap: 36px; padding-bottom: 48px; }
  .showcase { order: -1; }
  .trust, .steps { grid-template-columns: 1fr; }
  .nav-links { display: none; }
}
```

- [ ] **Step 2: Create `SiteHeader.astro`**

```astro
---
// src/components/site/SiteHeader.astro
import ThemeToggle from "./ThemeToggle.astro";
import "../../styles/marketing.css";
---
<nav class="nav">
  <a class="brand" href="/">
    <span class="mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M6 2h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      </svg>
    </span>
    papersfly
  </a>
  <div class="nav-links">
    <a href="/create">Templates</a>
    <a href="/#how">How it works</a>
    <a href="/#privacy">Privacy</a>
  </div>
  <div class="nav-right">
    <ThemeToggle />
    <a class="btn btn-primary btn-sm" href="/create">Create a document</a>
  </div>
</nav>
```

- [ ] **Step 3: Create `SiteFooter.astro`**

```astro
---
// src/components/site/SiteFooter.astro
import "../../styles/marketing.css";
---
<footer class="foot">
  <div class="wrap foot-row">
    <a class="brand" href="/">
      <span class="mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M6 2h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
        </svg>
      </span>
      papersfly
    </a>
    <span class="foot-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect width="18" height="11" x="3" y="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      100% client-side
    </span>
    <small class="foot-note">Free &amp; open source · No data collected</small>
  </div>
</footer>
```

- [ ] **Step 4: Build to verify the CSS + components compile**

Run: `pnpm build`
Expected: succeeds (components aren't used by a page yet, but Astro still type-checks them when imported in Tasks 10–11; this step just confirms no syntax errors by running a build).

- [ ] **Step 5: Checkpoint (no commit)**

Confirm `pnpm build` is green.

---

### Task 10: `/create` page

**Files:**
- Create: `src/pages/create.astro`

**Interfaces:**
- Consumes: `BaseLayout`, `SiteHeader.astro`, `CreateGallery.tsx`, `marketing.css`.
- Produces: the gallery page at `/create`.

- [ ] **Step 1: Create the page**

```astro
---
// src/pages/create.astro
import BaseLayout from "../layouts/BaseLayout.astro";
import SiteHeader from "../components/site/SiteHeader.astro";
import { CreateGallery } from "../components/create/CreateGallery";
import "../styles/marketing.css";

const title = "Create a document — papersfly";
const description =
  "Choose a document type and a template. Everything renders in your browser — no upload, no signup.";
---

<BaseLayout title={title} description={description}>
  <div class="site">
    <div class="wrap">
      <SiteHeader />
      <div class="create-head">
        <h1 class="create-title">Create a document</h1>
        <p class="create-sub">
          Choose a document type, then pick a template. Everything renders in your
          browser — nothing is uploaded.
        </p>
      </div>
      <CreateGallery client:only="react" />
    </div>
  </div>
</BaseLayout>
```

- [ ] **Step 2: Build and verify the page exists**

Run: `pnpm build`
Expected: succeeds.
Run: `test -f dist/create/index.html && echo CREATE_PAGE_OK`
Expected: prints `CREATE_PAGE_OK`.
Run: `grep -q "Create a document" dist/create/index.html && echo HEADING_OK`
Expected: prints `HEADING_OK`.

- [ ] **Step 3: Manual check**

Run `pnpm preview`, open `http://localhost:4321/create`. Confirm: the resume pill is active, the Classic card shows a mini resume preview, clicking it navigates to `/build/resume/classic`, the theme toggle flips light/dark, and the sheet thumbnail stays white in dark mode. Stop the server.

- [ ] **Step 4: Checkpoint (no commit)**

Confirm `pnpm build` green and `dist/create/index.html` exists.

---

### Task 11: Landing page (`/`)

**Files:**
- Modify: `src/pages/index.astro` (replace the builder mount with the landing page)

**Interfaces:**
- Consumes: `BaseLayout`, `SiteHeader.astro`, `SiteFooter.astro`, `marketing.css`, `ClassicPreview` (default export) + `sampleResume`, and `classic.css`.
- Produces: the marketing landing page; the builder now lives only at `/build/...`.

- [ ] **Step 1: Replace `index.astro` entirely**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import SiteHeader from "../components/site/SiteHeader.astro";
import SiteFooter from "../components/site/SiteFooter.astro";
import ClassicPreview from "../templates/classic/ClassicPreview";
import { sampleResume } from "../data/resume";
import "../styles/marketing.css";
import "../templates/classic/classic.css";

const title = "papersfly — beautiful documents that never leave your browser";
const description =
  "Pick a template, fill it in, and export a true-vector PDF with selectable text and embedded fonts. 100% client-side, works offline, no signup.";
---

<BaseLayout title={title} description={description}>
  <div class="site">
    <div class="wrap">
      <SiteHeader />
      <section class="hero">
        <div>
          <span class="eyebrow"><span class="dot"></span>100% client-side · no account</span>
          <h1 class="hero-title">Beautiful documents that <span class="accent">never leave your browser.</span></h1>
          <p class="hero-lede">Pick a template, fill it in, and export a true-vector PDF — selectable text, embedded fonts. Nothing is uploaded.</p>
          <div class="cta-row">
            <a class="btn btn-primary" href="/create">
              Create a document
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <a class="btn btn-ghost" href="/#how">See how it works</a>
          </div>
          <p class="cta-note">Free<span class="dotsep"></span>No sign-up<span class="dotsep"></span>Works offline</p>
        </div>
        <div class="showcase">
          <span class="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Stays on your device
          </span>
          <div class="hero-showcase">
            <ClassicPreview data={sampleResume} />
          </div>
        </div>
      </section>
    </div>

    <section class="section section-alt" id="privacy">
      <div class="wrap">
        <div class="sec-head">
          <span class="sec-eyebrow">Privacy by architecture</span>
          <h2 class="sec-title">Your data never leaves your browser.</h2>
          <p class="sec-sub">There is no server to send your documents to. Editing, rendering, and the PDF itself all happen on your device.</p>
        </div>
        <div class="trust">
          <div class="t-card">
            <div class="t-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
            <h3 class="t-title">Nothing is uploaded</h3>
            <p class="t-text">Your content is built and rendered entirely in the browser. No file ever touches a network.</p>
          </div>
          <div class="t-card">
            <div class="t-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" x2="22" y1="8" y2="13" /><line x1="22" x2="17" y1="8" y2="13" /></svg></div>
            <h3 class="t-title">No account, ever</h3>
            <p class="t-text">No sign-up, no email, no tracking pixels. Open the page and start building immediately.</p>
          </div>
          <div class="t-card">
            <div class="t-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h.01" /><path d="M8.5 16.43a5 5 0 0 1 7 0" /><path d="M5 12.86a10 10 0 0 1 5.17-2.69" /><path d="M19 12.86a10 10 0 0 0-2.01-1.52" /><path d="M2 8.82a15 15 0 0 1 4.18-2.64" /><path d="M22 8.82a15 15 0 0 0-11.29-3.76" /><path d="m2 2 20 20" /></svg></div>
            <h3 class="t-title">Works offline</h3>
            <p class="t-text">After the first load, disconnect entirely and keep editing and exporting. No connection needed.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="how">
      <div class="wrap">
        <div class="sec-head">
          <span class="sec-eyebrow">How it works</span>
          <h2 class="sec-title">Three steps to a finished PDF.</h2>
        </div>
        <div class="steps">
          <div>
            <div class="step-num">01</div>
            <div class="step-bar"></div>
            <h3 class="step-title">Choose a template</h3>
            <p class="step-text">Start from a document type and a design. Each one is a real, print-ready layout.</p>
          </div>
          <div>
            <div class="step-num">02</div>
            <div class="step-bar"></div>
            <h3 class="step-title">Fill in the form</h3>
            <p class="step-text">Type into a clean editor and watch the live preview update at true page size.</p>
          </div>
          <div>
            <div class="step-num">03</div>
            <div class="step-bar"></div>
            <h3 class="step-title">Download a vector PDF</h3>
            <p class="step-text">Export selectable text with embedded fonts — not a flat screenshot — in one click.</p>
          </div>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</BaseLayout>
```

- [ ] **Step 2: Build and verify landing content + SSR showcase**

Run: `pnpm build`
Expected: succeeds.
Run: `grep -q "never leave your browser" dist/index.html && echo HERO_OK`
Expected: prints `HERO_OK`.
Run: `grep -q "Jordan Avery Chen" dist/index.html && echo SHOWCASE_SSR_OK`
Expected: prints `SHOWCASE_SSR_OK` (proves `ClassicPreview` rendered to static HTML — the showcase needs no JS).
Run: `grep -q 'href="/create"' dist/index.html && echo CTA_OK`
Expected: prints `CTA_OK`.

- [ ] **Step 3: Full suite + manual pass**

Run: `pnpm exec vitest run`
Expected: ALL tests PASS.
Run `pnpm preview` and walk the whole flow: `/` (hero, trust, how-it-works, footer; toggle dark — hero sheet stays white) → click "Create a document" → `/create` → click the Classic card → `/build/resume/classic` → "← Templates" returns to `/create`. Download a PDF from the builder and verify it opens. Stop the server.

- [ ] **Step 4: Checkpoint (no commit)**

Confirm `pnpm build` and `pnpm exec vitest run` are both green and all three greps printed OK.

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|---|---|
| `/` landing page (hero + trust + how-it-works + footer) | 9, 11 |
| Real SSR `ClassicPreview` hero showcase | 11 (grep verifies SSR) |
| `/create` doc-type pills + template cards + live previews | 7, 8, 10 |
| "Soon" pills + dashed placeholder card (illustrative) | 8, 9 |
| `/build/[doc]/[template]` via `getStaticPaths` | 1, 6 |
| Builder header: back link + active template, no dropdown | 5 |
| `builderHref` / `buildBuilderPaths` pure helpers + tests | 1 |
| Dark mode site-wide (`.dark`, no-flash, toggle) | 2, 3, 4 |
| Dark tokens for shadcn + app shell + marketing | 4, 9 |
| Paper-stays-white invariant | 4, 9 (class-only CSS), 11 (grep) |
| Tests: routing, theme, TemplateCard, CreateGallery, App | 1, 2, 3, 7, 8, 5 |
| papersfly brand / wordmark | 6, 9, 11 |

No gaps.

**2. Placeholder scan** — every code/CSS/markup step contains complete content; no TBD/TODO/"handle edge cases". The only intentionally-empty constructs are the illustrative "Soon" affordances (required by spec) and the `tmpl-thumb-skeleton` Suspense fallback.

**3. Type consistency** — `builderHref(docId, templateId)` and `buildBuilderPaths` signatures match across Tasks 1/6/7. `App({ docId?, templateId? })` matches its usage in Task 6 and tests in Task 5. `Template.description?` is added in Task 7 before `TemplateCard`/`CreateGallery` read it. `CreateGallery({ documents? })` matches its test (Task 8) and the prop-less mount in Task 10. `THEME_KEY`/`toggleTheme`/`applyTheme`/`resolveInitialTheme`/`getStoredTheme` are all defined in Tasks 2 and 4 before use in Tasks 3, 4.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-26-papersfly-multipage-site.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
