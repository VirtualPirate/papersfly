# Error pages (404 + 500) — design

**Date:** 2026-07-15
**Status:** Approved, ready for implementation plan

## Goal

Add branded `404` and `500` error pages to the papersfly site, matching the
existing "blueprint/datasheet" aesthetic used by `/about`, `/privacy`,
`/alternatives`, and `/vs/*`. Error pages keep the site chrome so users have
clear escape routes back into the app.

## Scope

- New page: `src/pages/404.astro`
- New page: `src/pages/500.astro`
- Small backward-compatible change to `src/layouts/BaseLayout.astro`:
  add optional `noindex` and `noSchema` props.

Out of scope: any new CSS (both pages reuse existing `marketing.css` classes),
and host/CDN configuration to actually serve `500.html` on origin errors.

## Behavior & delivery

- `404.astro` is Astro's documented special page. In this static build it is
  emitted as `404.html`, and the Astro dev/preview server serves it
  automatically for unknown routes.
- `500.astro` is built to `500.html` as a normal prerendered route.
  **Caveat:** papersfly is fully client-side with no server runtime, so a 500 is
  only ever produced by the host/CDN, not by the app. The static `500.html` file
  will exist; wiring a host (Netlify/Vercel/Cloudflare/etc.) to serve it on
  origin errors is host-specific and intentionally out of scope. This caveat is
  documented so no one expects Astro itself to serve it.

## Page structure (both pages)

Each page mirrors the `about.astro` pattern:

- `BaseLayout` with a page-specific `title` and `description`, plus the new
  `noindex` and `noSchema` props set to `true`.
- `SiteHeader` (nav) and `SiteFooter` for consistency and navigation.
- A `cmp-hero` block containing:
  - `cmp-eyebrow` — e.g. `Error · 404`
  - `cmp-title` with an `accent` span
  - `cmp-lede` — the error message
  - `cmp-tblock` drawing-callout with rows: Drawing / Sheet (`ERR-404` /
    `ERR-500`) / Status.
- A `cta-row` with two `btn` links:
  - **Back home** → `/`
  - **Build a resume** → `/create-resume`

No JSON-LD, no breadcrumb on error pages.

## Copy (draft)

**404**
- eyebrow: `Error · 404`
- title: `This page isn't on the` **`blueprint.`**
- lede: "The page you're looking for doesn't exist — it may have been moved or
  the link was mistyped. Everything still runs in your browser; let's get you
  back to it."
- tblock: Drawing `err-404` · Sheet `ERR-404` · Status `Not found`

**500**
- eyebrow: `Error · 500`
- title: `Something` **`came off the rails.`**
- lede: "An unexpected error occurred. papersfly runs entirely in your browser,
  so your document data is safe on your device. Try reloading, or head back and
  start again."
- tblock: Drawing `err-500` · Sheet `ERR-500` · Status `Server error`

## BaseLayout changes

Two new optional props, both defaulting to the current behavior so existing
pages are unaffected:

- `noindex?: boolean` (default `false`) — when `true`, emit
  `<meta name="robots" content="noindex" />` in `<head>`.
- `noSchema?: boolean` (default `false`) — when `true`, emit **no**
  `application/ld+json` scripts at all (suppresses the site-wide
  Organization/WebSite and the default `WebApplication` schema). Prevents a 404
  from advertising full app schema.

When `noSchema` is `false`, the existing schema graph is emitted exactly as
today.

## Verification

- `pnpm build` type-checks and produces `dist/404.html` and `dist/500.html`.
- Existing pages still emit their JSON-LD (no regression from `noSchema`
  default).
- Error pages contain `<meta name="robots" content="noindex">` and no
  `application/ld+json`.
- Both pages render header, hero, CTA buttons, and footer using existing CSS.
