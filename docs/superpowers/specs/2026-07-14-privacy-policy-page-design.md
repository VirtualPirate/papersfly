# Privacy Policy Page — Design

**Date:** 2026-07-14
**Status:** Approved (brainstorming complete)
**Route:** `/privacy`

## Purpose

papersfly markets itself heavily on privacy ("your data never leaves your
browser", "no tracking pixels", footer "No data collected"). This is true of
**document content** — resumes/invoices are built, rendered, and exported to PDF
entirely client-side, nothing uploaded. However, **PostHog product analytics is
wired in** (`src/components/posthog.astro` + `capture()` calls across the app),
which does collect anonymous usage data and sends it to PostHog's servers.

A privacy policy page must reconcile these honestly: keep the strong (and true)
"your documents stay on your device" story while transparently disclosing the
anonymous product analytics that is actually collected.

**Decision (confirmed with user):** honest disclosure of PostHog — do NOT harden
the config and do NOT remove analytics. Describe reality accurately.

## Key facts the policy must state accurately

- **Document content is never transmitted.** Editing, live preview, and the
  true-vector PDF export all run in the browser. No resume/invoice field text is
  ever sent anywhere. Works fully offline after first load.
- **Analytics events contain only style choices, never document text.** Verified
  by inspecting every `posthog.capture()` call:
  - `template_selected` → `doc_type`, `template_id`, `template_name`
  - `pdf_downloaded` → `doc_type`, `template_id`, `template_name`, `color_id`,
    `font_id`, `spacing_id`, `size_id`
  - `pdf_download_failed` → `doc_type`, `template_id`
  - `variant_changed` → `doc_type`, `template_id`, `color_id`, `font_id`,
    `changed_fields`
  - `import_completed` → `doc_type`, `template_id`
  - `cta_clicked` → `location`
  - `captureException` (error reports) → `doc_type`, `template_id` + the error
  None of these include the content of the document.
- **PostHog default technical metadata.** In addition to the custom events,
  PostHog by default collects things like an anonymous randomly-generated device
  ID, approximate location derived from IP, browser/device/OS info, current and
  referring page URL, and autocaptured interaction events. The policy discloses
  this generically and honestly.
- **Analytics is optional to the app.** The builder runs fully without it; it can
  be disabled at build time via `PUBLIC_POSTHOG_DISABLED`, and end users can
  block the analytics domain / use tracker-blocking with no loss of function.

## Responsible entity & contact

- Project name: **papersfly** (open-source project; no formal company entity).
- Privacy contact: **artaza.developer@gmail.com**.

## Page shell & SEO

- New file `src/pages/privacy.astro`.
- Wrapped in `BaseLayout` (provides SEO `<head>`, auto canonical from
  `Astro.url.pathname`, theme boot script, and the PostHog snippet — consistent
  with every other page).
- `title` / `description` set for the policy page.
- Emits a **BreadcrumbList** JSON-LD (Home → Privacy) via `extraJsonLd`, matching
  the pattern in `alternatives.astro`. No FAQ/other schema needed.
- `effectiveDate` constant, a display string `"July 14, 2026"`, rendered in the
  header spec block and in the "Changes to this policy" section.

## Visual treatment — datasheet / blueprint (matches /alternatives & /vs)

Reuse existing marketing classes so the page reads as part of the site:

- Hero: `cmp-hero` > `cmp-head` with `cmp-eyebrow` ("Legal · Privacy policy"),
  `cmp-title`, `cmp-lede`, and `cmp-updated` (effective date with the small clock
  SVG used on `alternatives.astro`).
- A `cmp-tblock` spec block adapted to policy metadata, e.g.
  `Doc: PRIVACY-00`, `Rev: 1.0`, `Effective: <date>`, `Scope: papersfly.app`,
  `Status: Approved`.
- Body content lives inside `section` / `section-alt` > `wrap`, in a new readable
  prose column.

### New CSS (added to `src/styles/marketing.css`)

Add ONE small block for a legal/prose column, using existing design tokens
(colors, spacing, fonts) — no new tokens, no external anything:

- `.legal` — max-width ~68–72ch, centered, comfortable line-height.
- `.legal h2` / `.legal h3` — section headings consistent with `sec-title`
  scale/weight.
- `.legal p`, `.legal ul`, `.legal li`, `.legal a` — readable body styles.
- Section separators reuse the existing `cmp-rule-h` blueprint rule between major
  sections.
- Verify dark-mode correctness (the site is theme-aware via `.dark` on `<html>`).

Keep the CSS minimal and idiomatic to the existing file.

## Content sections (in order)

1. **The short version** (TL;DR) — documents never leave your device; only
   anonymous product analytics is collected; no account, no ads, works offline.
2. **Your documents stay in your browser** — client-side architecture; nothing
   uploaded; offline-capable; no resume/invoice content transmitted.
3. **What we do collect — product analytics (PostHog)** — the event list above,
   stated plainly as "style choices, never document text"; plus the default
   PostHog technical metadata; and *why* (understand which templates/features are
   used to improve the product).
4. **Cookies & local storage** — theme preference (`papersfly-theme`) in
   localStorage; PostHog's anonymous-ID storage; explicitly no advertising
   cookies / no cross-site ad tracking.
5. **Third parties** — PostHog (linked) as the analytics processor; static
   hosting/CDN serving the site. No selling of data.
6. **Opting out** — analytics is not required; block the analytics host or use a
   tracker blocker and the app still works fully (offline).
7. **Data retention & your rights** — brief; anonymous analytics; contact route
   for questions or requests.
8. **Changes to this policy** — we may update; effective date reflects the latest
   version.
9. **Contact** — artaza.developer@gmail.com.

Tone: plain, technical, honest — matching the site's existing voice (see the
homepage "Privacy by architecture" section and the competitor pages).

## Wiring changes

- **`src/components/site/SiteFooter.astro`:**
  - Add a `Privacy` link to `/privacy` in the footer row (`foot-row`).
  - **Honesty tweak (approved):** change the footer note from
    `"Free & open source · No data collected"` to
    `"Free & open source · Your documents stay on your device"` so it no longer
    contradicts the honest analytics disclosure.
- **`src/components/site/SiteHeader.astro`:** leave the nav "Privacy" link
  pointing at `/#privacy` (the marketing section) — **no change** (confirmed with
  user).

## Verification

- `pnpm build` — runs `astro check` (type-check) + static build; must pass with
  no errors.
- Browser harness (playwright-core + system Chrome) against `pnpm preview`:
  - `/privacy` renders with `SiteHeader` + `SiteFooter`.
  - Footer `Privacy` link navigates to `/privacy`; footer note shows the new copy.
  - Page is readable and correct in both light and dark themes.
- Confirm `/privacy` is included in the generated sitemap (Astro sitemap
  integration picks up static pages automatically; verify in `dist/`).

## Out of scope

- No Terms of Service page (separate request if wanted).
- No cookie-consent banner / opt-in UI (not adding new user-facing consent flow;
  analytics stays as-is per the honest-disclosure decision).
- No changes to PostHog config or event instrumentation.

## Notes

- Per user preference, **no git commits** are performed by the agent; the user
  handles all commits.
