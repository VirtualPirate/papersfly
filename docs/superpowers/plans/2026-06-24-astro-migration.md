# Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the existing client-side Vector Résumé Builder through an Astro shell — static SEO-rich `<head>`, sitemap/robots, smaller initial JS — while reusing all existing React/TS code and keeping behavior identical.

**Architecture:** Astro renders a static page shell (SEO meta, JSON-LD, font preload, a pre-hydration skeleton). The entire résumé tool (`src/App.tsx` and its modules) mounts as a single `client:only="react"` island — server rendering it is pointless and unsafe because PDF export (jsPDF `doc.html()`) and the scaling logic require a real browser DOM. SEO lives in the statically rendered `<head>`, not in the editor DOM. The heavy jsPDF + embedded-font chunk is deferred to the Download click.

**Tech Stack:** Astro 5 (static output), `@astrojs/react`, `@astrojs/sitemap`, `@astrojs/check`, React 19, jsPDF, vitest + React Testing Library, pnpm. Build-time only: `@resvg/resvg-js` (OG image generation).

## Global Constraints

- **Package manager:** pnpm (lockfile is `pnpm-lock.yaml`). Use `pnpm`, never npm/yarn.
- **Node:** project runs on Node 22.x (Astro 5 requires Node `18.20.8+`, `20.3+`, or `22+`).
- **Output:** `output: 'static'` (Astro default) — no SSR adapter; deploys to any static host.
- **Single origin source of truth:** the production URL is defined **once** as `site` in `astro.config.mjs`. Canonical, Open Graph, Twitter, sitemap, and robots.txt all derive from it. Placeholder value: `https://example.com` — this is the only place to change when the domain is chosen.
- **Reuse:** do not modify `src/forms/*`, `src/documents/*`, `src/templates/*`, `src/fonts/*`, `src/pdf/*`, `src/theme/*`, `src/data/*`, or `src/test/*`. The only React file that changes is `src/App.tsx` (one edit, Task 3).
- **TypeScript strictness:** preserve the project's existing flags exactly — `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- **No brand assets:** favicon and OG image are simple, unbranded placeholders generated in-repo.
- **Behavior parity:** the tool must work exactly as today (editor, live preview, document-type selector, reset, true-vector PDF download, unsupported-character warning).

---

## File Structure

**Created:**
- `astro.config.mjs` — Astro config: `site`, react + sitemap integrations, stylesheet inlining, carried-over chunk-size limit.
- `vitest.config.ts` — standalone test config (decoupled from Astro) so the existing suite runs unchanged.
- `src/layouts/BaseLayout.astro` — `<html>`/`<head>` with all SEO meta, JSON-LD, font preload; renders `<slot/>` in `<body>`.
- `src/pages/index.astro` — imports the React `App`, renders it as a `client:only` island behind a static skeleton; inline boot script removes the skeleton on mount.
- `src/pages/robots.txt.ts` — endpoint that emits `robots.txt` deriving the sitemap URL from `site`.
- `public/favicon.svg` — minimal unbranded document glyph.
- `public/og-image.png` — 1200×630 social card (generated, committed).
- `scripts/gen-og.mjs` — one-off OG image generator (mirrors the existing `scripts/gen-fonts.mjs` pattern).

**Modified:**
- `package.json` — scripts (`dev`/`build`/`preview` → Astro; add `gen:og`) + dependencies.
- `tsconfig.json` — extend `astro/tsconfigs/base`, re-add existing strict flags, add JSX + `.astro` types.
- `src/index.css` — drop the `#root` height selector; add skeleton styles.
- `src/App.tsx` — defer `pdf/download` (and thus jsPDF + base64 fonts) to a dynamic import on download.
- `README.md` — update commands and document the SEO setup + `site` constant.
- `.gitignore` — add `coverage`.

**Deleted:**
- `index.html` (root) — replaced by `BaseLayout.astro` + `index.astro`.
- `src/main.tsx` — Astro owns hydration now.
- `vite.config.ts` — replaced by `astro.config.mjs` + `vitest.config.ts`.

---

## Task 1: Astro toolchain + standalone test config (no UI change yet)

Installs Astro and rewires tooling so the **existing test suite still passes** through a standalone vitest config. No Astro pages exist yet, so `astro build`/`astro dev` are intentionally NOT run in this task.

**Files:**
- Modify: `package.json`
- Create: `astro.config.mjs`
- Create: `vitest.config.ts`
- Modify: `tsconfig.json`
- Modify: `.gitignore`
- Delete: `vite.config.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `pnpm test` runs via `vitest.config.ts`; `astro`, `@astrojs/react`, `@astrojs/sitemap`, `@astrojs/check` installed; `site = 'https://example.com'` defined in `astro.config.mjs`.

- [ ] **Step 1: Install Astro dependencies**

Run:
```bash
pnpm add astro @astrojs/react @astrojs/sitemap
pnpm add -D @astrojs/check
```
Expected: installs succeed; `node_modules/.bin/astro` now exists. React 19 peer-dep warnings (if any) are benign — `react`/`react-dom` 19 are already present.

- [ ] **Step 2: Create `astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// SINGLE SOURCE OF TRUTH for the production origin. Canonical/OG URLs, the
// sitemap, and robots.txt all derive from this. Replace with the real domain
// once chosen (must start with http:// or https://). For a subpath deploy
// (e.g. GitHub Pages project site) also set `base: "/repo-name/"`.
const SITE = "https://example.com";

// Fully static output (Astro default). The résumé tool is a browser-only React
// island (`client:only`); Astro only renders the SEO <head> + skeleton shell.
export default defineConfig({
  site: SITE,
  integrations: [react(), sitemap()],
  build: {
    // Inline small stylesheets into <head> to avoid a render-blocking request.
    inlineStylesheets: "auto",
  },
  vite: {
    build: {
      // The base64 embedded-font module is intentionally large on the PDF path.
      chunkSizeWarningLimit: 1600,
    },
  },
});
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Standalone test config, decoupled from Astro. Covers the React components and
// pure-TS modules exactly as before the migration.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [ ] **Step 4: Replace `tsconfig.json`**

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
    "noFallthroughCasesInSwitch": true
  }
}
```
Rationale: extend Astro's **base** (not `strict`/`strictest`) and re-add the project's current flags verbatim, so the migration introduces zero new TypeScript errors (avoids `verbatimModuleSyntax` churn) while keeping today's strictness.

- [ ] **Step 5: Update `package.json` scripts**

Replace the `"scripts"` block with:
```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "gen:fonts": "node scripts/gen-fonts.mjs",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```
(`gen:og` is added in Task 4.)

- [ ] **Step 6: Add `coverage` to `.gitignore`**

The file becomes:
```
node_modules
dist
coverage
*.local
.DS_Store
```

- [ ] **Step 7: Verify the test suite still passes (vite.config.ts still present)**

Run: `pnpm test`
Expected: all existing tests pass (App, SchemaForm, schema, update, registry, classic template, sanity).

- [ ] **Step 8: Delete `vite.config.ts` and re-verify tests use the new config**

Run:
```bash
rm vite.config.ts
pnpm test
```
Expected: same suite passes, now resolved via `vitest.config.ts` (proves the test config no longer depends on the deleted file).

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs vitest.config.ts tsconfig.json package.json pnpm-lock.yaml .gitignore
git rm vite.config.ts
git commit -m "build: add Astro toolchain and standalone vitest config"
```

---

## Task 2: Astro shell renders the existing tool as a client:only island

Replaces the Vite `index.html`/`main.tsx` entry with an Astro layout + page that mounts the unchanged React `App`. After this task `pnpm build` succeeds and the tool runs identically in the browser.

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`
- Create: `public/favicon.svg`
- Modify: `src/index.css`
- Delete: `index.html`
- Delete: `src/main.tsx`

**Interfaces:**
- Consumes (from Task 1): `astro.config.mjs` with `site` + `react()` integration; `App` named export from `src/App.tsx` (`export function App()`); global styles `src/index.css` and `src/fonts/fonts.css`; font asset `src/fonts/inter-regular.ttf`.
- Produces: a working static site at `/`; `BaseLayout` accepts props `{ title: string; description: string }`; the page mounts `<App client:only="react" />`; the React root element has class `app` (used by the skeleton-removal script).

- [ ] **Step 1: Create `src/layouts/BaseLayout.astro`**

```astro
---
import "../index.css";
import "../fonts/fonts.css";
import interRegular from "../fonts/inter-regular.ttf?url";

interface Props {
  title: string;
  description: string;
}
const { title, description } = Astro.props;

// All absolute URLs derive from the `site` config (astro.config.mjs).
const canonical = new URL(Astro.url.pathname, Astro.site).href;
const ogImage = new URL("/og-image.png", Astro.site).href;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Vector Résumé Builder",
  description,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any (modern web browser)",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Live résumé preview",
    "True-vector PDF export with selectable text and embedded fonts",
    "Works fully offline in the browser",
  ],
  url: canonical,
};
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta name="theme-color" content="#1f3a5f" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

    <!-- Preload the body font so first paint uses the correct typeface. -->
    <link rel="preload" href={interRegular} as="font" type="font/ttf" crossorigin />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImage} />

    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  </head>
  <body>
    <slot />
    <noscript>This résumé builder requires JavaScript to run in your browser.</noscript>
  </body>
</html>
```

- [ ] **Step 2: Create `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { App } from "../App";

const title = "Vector Résumé Builder — Free True-Vector PDF Résumé Maker";
const description =
  "Build a résumé in your browser and export a true-vector PDF with selectable text and embedded fonts. 100% client-side, works offline, no signup.";
---

<BaseLayout title={title} description={description}>
  {/* The tool is browser-only (jsPDF + live layout measurement), so it renders
      client-side. This static skeleton gives an instant paint and a crawlable
      heading; the inline script removes it the moment the React app mounts. */}
  <div id="app-skeleton" class="app-skeleton">
    <h1>Vector Résumé Builder</h1>
    <p>Live preview · true-vector PDF · 100% offline</p>
    <p class="app-skeleton__hint">Loading the editor…</p>
  </div>

  <App client:only="react" />
</BaseLayout>

<script is:inline>
  // Remove the static skeleton as soon as the React app (.app) mounts. Decoupled
  // from React/Astro internals so it survives version changes.
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

- [ ] **Step 3: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Résumé">
  <rect width="32" height="32" rx="6" fill="#1f3a5f" />
  <rect x="9" y="7" width="14" height="18" rx="2" fill="#ffffff" />
  <rect x="11.5" y="11" width="9" height="1.6" rx="0.8" fill="#1f3a5f" />
  <rect x="11.5" y="14.5" width="9" height="1.6" rx="0.8" fill="#1f3a5f" />
  <rect x="11.5" y="18" width="6" height="1.6" rx="0.8" fill="#1f3a5f" />
</svg>
```

- [ ] **Step 4: Edit `src/index.css` — drop the `#root` height rule**

Replace:
```css
html,
body,
#root {
  height: 100%;
  margin: 0;
}
```
with:
```css
html,
body {
  height: 100%;
  margin: 0;
}
```
(`#root` no longer exists; `.app` uses `height: 100vh`, so this is purely a cleanup. Astro wraps the island in `<astro-island>` which is `display: contents`, so `.app` still lays out as a direct child of `<body>`.)

- [ ] **Step 5: Edit `src/index.css` — add skeleton styles**

Immediately after the `/* ---- App shell ... */` block's `.app { ... }` rule, add:
```css
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
```

- [ ] **Step 6: Delete the old Vite entry files**

```bash
rm index.html src/main.tsx
```

- [ ] **Step 7: Type-check the Astro project**

Run: `pnpm exec astro check`
Expected: completes with **0 errors** (warnings about hints are acceptable). If it reports that `App` cannot be resolved for `client:only`, confirm the import path `../App` and that `react()` is in `astro.config.mjs`.

- [ ] **Step 8: Production build**

Run: `pnpm build`
Expected: `astro check` passes, then `astro build` writes `dist/` including `dist/index.html` (containing the `<head>` meta + JSON-LD + the skeleton markup) and hashed JS/CSS under `dist/_astro/`.

- [ ] **Step 9: Verify behavior in the browser (preview tools)**

Start the dev server and verify with the preview tooling (do NOT use raw Bash/curl for this):
1. Start the server (`preview_start`; it runs `pnpm dev`).
2. `preview_snapshot` — confirm the editor form (e.g. a "Basics" section, the name field showing "Jordan Avery Chen") and the live résumé preview heading "Jordan Avery Chen" are present, and the `#app-skeleton` is gone after mount.
3. `preview_console_logs` — confirm no errors (no hydration errors, no missing-module errors).
4. `preview_fill` the name field with a new value and `preview_snapshot` — confirm the preview updates live.
5. Switch the "Document type" select and confirm it still works.

Expected: the tool behaves exactly as before the migration.

- [ ] **Step 10: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/index.astro public/favicon.svg src/index.css
git rm index.html src/main.tsx
git commit -m "feat: render résumé builder via Astro shell with SEO head"
```

---

## Task 3: Defer jsPDF + embedded fonts to the Download click

`App.tsx` statically imports `pdf/download`, which pulls jsPDF **and** the large base64 font module (`fonts/fontData.ts`, via `registerFonts`) into the initial island bundle. Switch to a dynamic import so that chunk loads only when the user clicks Download. The existing `src/App.test.tsx` is the regression guard — it mocks `./pdf/download` and asserts the export is called once with the `.resume-page` element; vitest intercepts dynamic imports too, so it stays valid.

**Files:**
- Modify: `src/App.tsx`
- Test (existing, unchanged): `src/App.test.tsx`

**Interfaces:**
- Consumes: `downloadResumePdf(element: HTMLElement, filename: string): Promise<void>` from `src/pdf/download.ts` — now reached only via `await import("./pdf/download")`.
- Produces: no API change; jsPDF + base64 fonts move to a lazily-loaded chunk.

- [ ] **Step 1: Confirm the regression test currently passes**

Run: `pnpm test src/App.test.tsx`
Expected: PASS (3 tests), including "preloads the template so Download exports from a mounted .resume-page".

- [ ] **Step 2: Remove the static import in `src/App.tsx`**

Delete this line (currently line 11):
```ts
import { downloadResumePdf } from "./pdf/download";
```

- [ ] **Step 3: Dynamically import inside the export effect**

In the `useLayoutEffect` that runs when `capture` is set, change the body of the async IIFE from:
```ts
      try {
        await downloadResumePdf(host, "resume.pdf");
      } catch (err) {
```
to:
```ts
      try {
        const { downloadResumePdf } = await import("./pdf/download");
        await downloadResumePdf(host, "resume.pdf");
      } catch (err) {
```
(This is the only call site, so no static reference to `pdf/download` remains in the entry graph and Rollup emits jsPDF + the base64 fonts in their own chunk.)

- [ ] **Step 4: Run the regression test**

Run: `pnpm test src/App.test.tsx`
Expected: PASS (3 tests). The `waitFor(() => expect(downloadResumePdf).toHaveBeenCalledTimes(1))` assertion absorbs the extra microtask from the dynamic import; the mocked module is returned by `import()`.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 6: Verify the chunk split in the build**

Run:
```bash
pnpm build
ls -1 dist/_astro | grep -iE "jspdf|download|fontData" || echo "no dedicated chunk match"
```
Expected: a separate hashed chunk containing jsPDF (e.g. `jspdf.*.js` / a `download.*.js` chunk). The key outcome is that jsPDF is **not** bundled into the main island entry chunk.

- [ ] **Step 7: Verify lazy load in the browser (preview tools)**

1. `preview_start`, then `preview_network` on initial page load — confirm **no** jsPDF chunk is requested.
2. `preview_click` the "Download PDF" button.
3. `preview_network` again — confirm the jsPDF chunk is now fetched and a `resume.pdf` download is triggered (the button shows "Generating…" then returns to "↓ Download PDF").
4. `preview_console_logs` — no errors.

Expected: jsPDF/base64 fonts load only on the Download click; the PDF still downloads.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "perf: defer jsPDF and embedded fonts to the download click"
```

---

## Task 4: SEO endpoints + OG image (sitemap, robots.txt, social card)

The sitemap integration is already wired (Task 1). This task adds a `site`-derived `robots.txt`, a generated OG image, and verifies the full SEO output.

**Files:**
- Create: `src/pages/robots.txt.ts`
- Create: `scripts/gen-og.mjs`
- Create: `public/og-image.png` (generated artifact, committed)
- Modify: `package.json` (add `gen:og` script + `@resvg/resvg-js` devDependency)

**Interfaces:**
- Consumes: `site` from `astro.config.mjs` (available on the endpoint's `APIContext`); the OG meta in `BaseLayout.astro` referencing `/og-image.png`; the project fonts `src/fonts/inter-semibold.ttf` and `src/fonts/inter-regular.ttf`.
- Produces: `dist/robots.txt`, `dist/sitemap-index.xml`, `dist/sitemap-0.xml`, `dist/og-image.png` in the build.

- [ ] **Step 1: Install the OG image generator (build-time only)**

Run: `pnpm add -D @resvg/resvg-js`
Expected: installs successfully (prebuilt native binary for the platform).

- [ ] **Step 2: Create `scripts/gen-og.mjs`**

```js
// One-off generator for the social-share image (public/og-image.png).
// Unbranded placeholder: solid accent background + app name/tagline rendered in
// the project's own Inter fonts. Re-run with `pnpm gen:og` after copy changes.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#1f3a5f" />
  <text x="80" y="300" font-family="Inter" font-weight="600" font-size="76" fill="#ffffff">Vector Résumé Builder</text>
  <text x="80" y="372" font-family="Inter" font-weight="400" font-size="34" fill="#c7d2e4">Live preview · true-vector PDF · 100% offline</text>
</svg>`;

const resvg = new Resvg(svg, {
  font: {
    fontFiles: ["src/fonts/inter-semibold.ttf", "src/fonts/inter-regular.ttf"],
    loadSystemFonts: false,
    defaultFontFamily: "Inter",
  },
  fitTo: { mode: "width", value: W },
});

writeFileSync("public/og-image.png", resvg.render().asPng());
console.log("Wrote public/og-image.png");
```

- [ ] **Step 3: Add the `gen:og` script to `package.json`**

In `"scripts"`, add after `gen:fonts`:
```json
    "gen:og": "node scripts/gen-og.mjs",
```

- [ ] **Step 4: Generate the OG image**

Run: `pnpm gen:og`
Expected: prints `Wrote public/og-image.png`. Verify it exists and is ~1200×630:
```bash
file public/og-image.png
```
Expected: `PNG image data, 1200 x 630`.

- [ ] **Step 5: Create `src/pages/robots.txt.ts`**

```ts
import type { APIRoute } from "astro";

// Generated from the `site` config so the sitemap URL never drifts from the
// configured origin. Allows all crawlers.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site).href;
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap}`, ""].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
```

- [ ] **Step 6: Build and verify the SEO output files**

Run:
```bash
pnpm build
cat dist/robots.txt
ls -1 dist/sitemap-index.xml dist/sitemap-0.xml dist/og-image.png
```
Expected:
- `dist/robots.txt` contains `User-agent: *`, `Allow: /`, and `Sitemap: https://example.com/sitemap-index.xml`.
- `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist (the latter lists `https://example.com/`).
- `dist/og-image.png` exists.

- [ ] **Step 7: Verify the rendered `<head>` (preview tools)**

1. `preview_start`, navigate to `/`.
2. `preview_eval` `document.head.innerHTML` (or `preview_snapshot`) — confirm presence of: `<title>`, `meta[name=description]`, `link[rel=canonical]`, `meta[property="og:image"]` pointing at `/og-image.png`, `meta[name="twitter:card"][content="summary_large_image"]`, and the `application/ld+json` script with the `WebApplication` schema.

Expected: all SEO tags present and correct.

- [ ] **Step 8: Commit**

```bash
git add src/pages/robots.txt.ts scripts/gen-og.mjs public/og-image.png package.json pnpm-lock.yaml
git commit -m "feat: add robots.txt endpoint and generated OG image for SEO"
```

---

## Task 5: Production verification + docs

End-to-end check of the production build and a README refresh.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: a verified production build; updated docs.

- [ ] **Step 1: Clean production build + preview**

Run:
```bash
rm -rf dist
pnpm build
```
Expected: `astro check` passes (0 errors) and the build succeeds.

- [ ] **Step 2: End-to-end verification against the preview server (preview tools)**

Start the preview server (`preview_start` running `pnpm preview`), then:
1. `preview_snapshot` — editor + live preview render; `#app-skeleton` removed after mount.
2. `preview_network` on load — jsPDF chunk NOT requested.
3. `preview_fill` a field → `preview_snapshot` — preview updates live.
4. `preview_click` "Download PDF" → `preview_network` shows the jsPDF chunk loads and `resume.pdf` downloads; `preview_console_logs` shows no errors.

Expected: full parity with the pre-migration app, plus deferred jsPDF.

- [ ] **Step 3: Confirm no dangling references to deleted files**

Run:
```bash
grep -rIn --exclude-dir=node_modules --exclude-dir=dist -e "main.tsx" -e "vite.config" -e '#root' . || echo "clean"
```
Expected: `clean` (or only matches inside `docs/` history/specs, which are fine).

- [ ] **Step 4: Update `README.md`**

Make these edits:
- In the quick-start block, replace the npm/dev lines with:
```bash
pnpm install
pnpm dev        # Astro dev server — open the printed localhost URL
```
- In the "Other scripts" block, replace with:
```bash
pnpm build       # astro check (type-check) + static production build into dist/
pnpm preview     # serve the production build locally
pnpm gen:fonts   # regenerate the embedded base64 font module from the TTFs
pnpm gen:og      # regenerate public/og-image.png (social card)
```
- Add a short "## Hosting & SEO" section stating:
  - The app is built with **Astro** (static output) — the résumé tool is a `client:only` React island; SEO lives in the statically rendered `<head>` (title, description, canonical, Open Graph, Twitter, JSON-LD `WebApplication`), with an auto-generated `sitemap-index.xml` and a `robots.txt`.
  - **Set the production domain in one place:** the `SITE` constant (`site` option) in `astro.config.mjs`. Canonical/OG/sitemap/robots all derive from it. For a subpath deploy, also set `base`.
  - Output is fully static (`dist/`) — deploy to any static host; no adapter required.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update commands and document Astro/SEO setup"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-24-astro-migration-design.md`):
- "Just wrap the tool" / reuse React code → Tasks 2–3 (only `App.tsx` changes; one edit). ✓
- `client:only="react"` hydration → Task 2 Step 2. ✓
- Replace shell (`index.html`→BaseLayout, `main.tsx`→index.astro, `vite.config.ts`→astro+vitest) → Tasks 1–2. ✓
- SEO `<head>`: title, description, canonical, OG, Twitter, theme-color, JSON-LD `WebApplication` → Task 2 Step 1. ✓
- Sitemap + robots.txt → Task 1 (sitemap integration) + Task 4 (robots endpoint). ✓
- Crawlable static intro / noscript → Task 2 (skeleton `<h1>` + `<noscript>`). ✓
- Single `site` source of truth + placeholder origin → Task 1 Step 2; all URLs derive from it (Task 2, Task 4). ✓
- Perf: defer jsPDF + base64 fonts → Task 3; inline CSS → Task 1 config; preload body font → Task 2 Step 1; carry `chunkSizeWarningLimit` → Task 1 config. ✓
- Skeleton fallback for instant paint → Task 2 (static skeleton + MutationObserver removal; corrects spec's "fallback slot" wording — `client:only` has no fallback slot). ✓
- Keep vitest + RTL via standalone config → Task 1. ✓
- Scripts/tsconfig/pnpm/deps → Task 1. ✓
- `index.css` `#root` retarget → Task 2 Step 4. ✓
- OG image generated once, committed; favicon → Task 4 / Task 2 Step 3. ✓
- Out of scope (no landing pages, no woff2, no redesign) → respected. ✓

**2. Placeholder scan:** No "TBD/TODO/implement later". Every code/content step contains the full file or exact edit. The only literal placeholder is the intentional `https://example.com` origin, documented as the single change point. ✓

**3. Type/name consistency:** `BaseLayout` props `{ title, description }` defined (Task 2 S1) and passed (Task 2 S2). `downloadResumePdf(host, "resume.pdf")` signature unchanged across Task 3. Skeleton element id `app-skeleton` and class `.app` consistent between `index.astro` (S2), the inline script (S2), and `index.css` (S5). `site` consumed identically in `BaseLayout.astro`, `robots.txt.ts`, and the sitemap integration. OG path `/og-image.png` consistent between `BaseLayout.astro` and the generator output. ✓

**Note recorded during planning (deviation from spec wording):** the spec described a "skeleton fallback in the `client:only` slot." Astro's `client:only` has **no** fallback slot (verified against Astro docs), so the plan implements the same intent via a static skeleton in `index.astro` removed by a small inline `MutationObserver` once `.app` mounts. Same UX (instant paint, crawlable heading), decoupled from React.
