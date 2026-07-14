# Astro Migration — Design

**Date:** 2026-06-24
**Status:** Approved (design); pending implementation plan
**Scope decision:** "Just wrap the tool" — migrate the existing client-side React resume
builder onto an Astro shell, reuse all existing React/TS code, move SEO into a statically
rendered `<head>`, and trim the initial JS payload. No new marketing/content pages.

## Background

The "site" is a single-screen, 100% client-side React SPA (`vector-resume-builder`): an
editor form, a live-scaled preview, and a browser-only PDF export via jsPDF's `doc.html()`
(which requires a real, laid-out DOM and therefore cannot run on a server). There is no
static content to render and nothing in the editor DOM that is meaningfully indexable.

Astro's value here is therefore **not** SSR of the tool. It is:

- a statically rendered, SEO-rich `<head>` and crawlable page shell,
- zero framework JS for the shell (only the tool hydrates),
- a smaller initial payload (defer jsPDF + embedded fonts to the download click),
- inlined critical CSS, a sitemap, and `robots.txt`.

## Goals

1. Serve the existing builder through Astro with **identical behavior**.
2. Reuse essentially all existing React/TS code unchanged.
3. Top-notch on-page SEO: title, description, canonical, Open Graph, Twitter card,
   JSON-LD `WebApplication` schema, sitemap, `robots.txt`.
4. Faster initial load: defer the heavy PDF/font chunk; inline CSS; preload the body font.
5. Keep the existing vitest + RTL test suite green with minimal change.

## Non-goals (per "just wrap" scope)

- No landing page, template gallery, blog, or multi-page routing.
- No change to the PDF pipeline, fonts, templates, forms, or data shapes.
- No font format conversion (e.g. woff2). No design/visual redesign.
- No deployment adapter — output stays fully static.

## Approach (chosen)

**Hydration strategy: `client:only="react"`.**

The tool is browser-only, so a server render is throwaway and SSR would import jsPDF,
`ResizeObserver`, and `useLayoutEffect` paths in Node at build time (likely to throw or
require guards) for **zero** SEO benefit. `client:only="react"` renders the tool entirely
client-side, behind a static Astro shell that carries all SEO markup plus a lightweight
skeleton fallback for instant first paint.

Rejected alternatives:

- **`client:load`** (SSR + hydrate): build-time Node import hazards (jsPDF/browser APIs),
  hydration-mismatch risk from scale/`ResizeObserver`, and no indexable content to gain.
- **Rewrite shell as `.astro` with small islands**: most Astro-native and fastest, but
  contradicts "reuse as much as possible" and "just wrap"; most work and risk.

## Architecture

### Reused
`src/forms/*`, `src/documents/*`, `src/templates/*`, `src/fonts/*`, `src/pdf/*`,
`src/theme/*`, `src/data/*`, the entire test suite, and `scripts/*` — all unchanged.
`src/App.tsx` is reused with **one** change (the download handler dynamic-imports
`pdf/download` — see Performance). `src/index.css` gets one small tweak (see below).

### Replaced (the shell only)
- `index.html` → `src/layouts/BaseLayout.astro` (the `<html>`/`<head>` + all SEO meta)
- `src/main.tsx` → `src/pages/index.astro` (mounts `<App client:only="react" />` with a
  skeleton fallback slot; imports global CSS)
- `vite.config.ts` → `astro.config.mjs` + a standalone `vitest.config.ts`

### Target file layout
```
astro.config.mjs            react() + sitemap(); `site` origin constant; output: 'static';
                            vite.build.chunkSizeWarningLimit carried over; inlineStylesheets: 'auto'
vitest.config.ts            standalone: @vitejs/plugin-react + jsdom env + ./src/test/setup.ts
tsconfig.json               extends astro/tsconfigs/strict; keep existing strict flags
src/
  layouts/BaseLayout.astro  <html lang><head> SEO + JSON-LD + font preload </head><body><slot/></body>
  pages/index.astro         imports App + global CSS; <App client:only="react"/> + skeleton fallback;
                            small crawlable static intro for bots
  App.tsx                   unchanged EXCEPT: download handler dynamic-imports pdf/download (see Perf)
  forms/ documents/ templates/ fonts/ pdf/ theme/ data/   ← untouched
  index.css                 retarget `#root { height:100% }` rule to body/astro-island
public/
  robots.txt                allow all + Sitemap: <site>/sitemap-index.xml
  favicon.svg               minimal unbranded page/document glyph (hand-authored SVG)
  og-image.png              1200x630 plain background + app name/tagline (generated once, committed)
```

## SEO (static, in `BaseLayout.astro`)

- `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<html lang="en">`
- Open Graph: `og:title`, `og:description`, `og:type=website`, `og:url`, `og:image`
- Twitter: `summary_large_image` + `twitter:title/description/image`
- `theme-color`; viewport already present
- JSON-LD `WebApplication`: name, description, `applicationCategory: BusinessApplication`,
  `offers` (price 0 / free), `featureList` (live preview, true-vector PDF, offline)
- `@astrojs/sitemap` integration auto-emits the sitemap; `robots.txt` references it
- A small crawlable static intro (visually-hidden or within the skeleton) so the page is
  not content-empty for crawlers, since the React tree is client-only
- All absolute URLs derive from one `site` constant in `astro.config.mjs` — **the single
  spot to change** once a production domain is chosen. Placeholder: `https://example.com`.

## Performance

1. **Defer jsPDF + embedded-font base64.** `App.tsx` currently statically imports
   `pdf/download.ts`, which pulls jsPDF and `fonts/fontData.ts` (the large base64 blob,
   via `registerFonts`) into the initial island chunk. Change the download handler to
   `const { downloadResumePdf } = await import("./pdf/download")` so that chunk loads only
   on the Download click. Single biggest initial-payload win; ~3-line change. Templates are
   already lazy (`lazyTemplate`) and stay so.
2. **Zero framework JS for the shell** — only the island hydrates.
3. **Inline critical CSS** via Astro `build.inlineStylesheets: 'auto'` → no render-blocking
   stylesheet round-trip and no FOUC for global styles.
4. **Preload the regular-weight body font** with `<link rel="preload" as="font"
   type="font/ttf" crossorigin>` so first paint uses the correct typeface.
5. Carry `chunkSizeWarningLimit: 1600` into Astro's `vite` config (the base64 font module
   is intentionally large on the PDF path).
6. **Skeleton fallback** in the `client:only` slot → instant meaningful paint, no layout
   shift while the tool boots.

## Testing & tooling

- Keep **vitest + React Testing Library** unchanged via a standalone `vitest.config.ts`
  (`@vitejs/plugin-react`, `environment: jsdom`, `setupFiles: ["./src/test/setup.ts"]`).
  The tests cover React components and pure TS and do not need Astro. `src/test/setup.ts`
  (the `ResizeObserver` stub) is unchanged.
- `package.json` scripts: `dev → astro dev`, `build → astro check && astro build`,
  `preview → astro preview`; keep `gen:fonts` and `test`/`test:watch`.
- `tsconfig.json` extends `astro/tsconfigs/strict` (preserves strict flags, adds `.astro`).
- Stays on **pnpm**. Add deps: `astro`, `@astrojs/react`, `@astrojs/sitemap`,
  `@astrojs/check`. Existing `@vitejs/plugin-react`, `react`, `react-dom`, `jspdf`,
  `vitest`, `jsdom`, RTL all remain.

## Known adjustments (small, explicit)

- `index.css`: the `html, body, #root { height: 100% }` rule references a `#root` div that
  Astro does not create. Retarget height to `body` and make the island fill it
  (e.g. `astro-island { display: contents }` or `height: 100%` on the wrapper) so `.app`'s
  full-height flex layout is preserved.
- `og-image.png`: generated once (1200x630, plain background, app name + tagline in the
  app's own fonts) by a small build-time script and committed to `public/`. The
  rasterization method is an implementation-plan detail (e.g. a one-off Node script with a
  lightweight SVG→PNG rasterizer as a devDependency); no brand assets required.
- Output stays `output: 'static'` — no adapter; deploys to any static host.

## Risks & mitigations

- **Build-time browser-API import:** avoided by `client:only="react"` (tool never imported
  in Node at build).
- **CSS root selector mismatch:** handled by the `index.css` retarget above.
- **OG/canonical correctness before domain is known:** placeholder `site` origin with a
  single documented change point; everything else is correct immediately.
- **Test config drift:** standalone `vitest.config.ts` decouples tests from Astro, so the
  suite behaves exactly as today.

## Out of scope

Landing/marketing pages, template gallery, blog, multi-page routing, woff2 conversion,
visual redesign, and any change to the PDF/fonts/templates/forms/data internals.
