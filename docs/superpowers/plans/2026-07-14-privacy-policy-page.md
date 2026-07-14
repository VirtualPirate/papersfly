# Privacy Policy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/privacy` page that honestly discloses papersfly's data handling — documents stay 100% client-side, only anonymous product analytics (PostHog) is collected — styled in the site's datasheet/blueprint aesthetic, and link it from the footer.

**Architecture:** A single static Astro page (`src/pages/privacy.astro`) rendered through the existing `BaseLayout` + `SiteHeader`/`SiteFooter`, reusing the marketing "blueprint" classes (`cmp-hero`, `cmp-tblock`, `cmp-rule-h`) plus one new readable-prose CSS block (`.legal`). The footer gains a `/privacy` link and an honesty copy tweak.

**Tech Stack:** Astro (static output), existing `src/styles/marketing.css` design tokens, `@astrojs/sitemap` (auto-includes the new page), puppeteer-core + system Chrome for browser verification (matching `scripts/screenshot.mjs`).

## Global Constraints

- Package manager is **pnpm**. Build command is `pnpm build` (= `astro check && astro build`).
- **No git commits by the agent** — the user handles all commits (saved preference). Every "checkpoint" step is a review pause, not a commit.
- **No new dependencies.** Reuse existing tokens/classes/components only; page must stay self-contained and theme-aware (light + dark via `.dark` on `<html>`).
- **Honest-disclosure content rules (verbatim facts):** document content is *never* transmitted; analytics events carry *only style choices, never document text*; contact email is exactly `artaza.developer@gmail.com`; effective date string is exactly `July 14, 2026`.
- **Route is `/privacy`.** Header nav "Privacy" link stays pointing at `/#privacy` (do NOT change it). Footer note copy changes from `Free & open source · No data collected` to `Free & open source · Your documents stay on your device`.
- Follow the existing page pattern in `src/pages/alternatives.astro` (BaseLayout props, canonical via `Astro.url.pathname`, BreadcrumbList via `extraJsonLd`).

---

## File Structure

- **Create** `src/pages/privacy.astro` — the policy page (frontmatter: SEO + breadcrumb JSON-LD; body: blueprint hero + `.legal` prose sections).
- **Modify** `src/styles/marketing.css` — append a `.legal` prose block (Task 1) and a `.foot-legal` link style (Task 2).
- **Modify** `src/components/site/SiteFooter.astro` — add `/privacy` link + change the footer note copy (Task 2).

---

## Task 1: Privacy page + prose CSS

**Files:**
- Create: `src/pages/privacy.astro`
- Modify: `src/styles/marketing.css` (append `.legal` block at end of file)

**Interfaces:**
- Consumes: `BaseLayout` (props `title: string`, `description: string`, `extraJsonLd?: Record<string,unknown>[]`), `SiteHeader`, `SiteFooter`, and marketing classes `site`, `wrap`, `cmp-hero`, `cmp-head`, `cmp-eyebrow`, `cmp-title`, `accent`, `cmp-lede`, `cmp-updated`, `cmp-tblock` (`.r`/`.c`/`.k`/`.v`/`.v.big`/`.v.ok`), `section`, `cmp-rule-h` (`.lbl`/`.ln`).
- Produces: route `/privacy`; new CSS class `.legal` (and descendants `.legal h2`, `.legal p`, `.legal ul`, `.legal li`, `.legal a`).

- [ ] **Step 1: Append the `.legal` prose block to `src/styles/marketing.css`**

Add at the very end of the file:

```css

/* ── Legal / policy prose (privacy page) ──────────────────────────────────
   Readable long-form column reusing the site tokens. Major sections are
   separated by the existing .cmp-rule-h blueprint rule. */
.legal { max-width: 72ch; margin: 0 auto; color: var(--ink); }
.legal > h2:first-child { margin-top: 0; }
.legal h2 { font-family: var(--f-display); font-weight: 700; font-size: clamp(1.5rem, 2.4vw, 2rem); line-height: 1.05; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink); margin: 0 0 14px; }
.legal p { font-size: 1rem; line-height: 1.72; color: var(--muted); margin: 0 0 18px; }
.legal ul { margin: 0 0 18px; padding-left: 1.2em; }
.legal li { font-size: 1rem; line-height: 1.7; color: var(--muted); margin: 0 0 10px; }
.legal p strong, .legal li strong { color: var(--ink); font-weight: 600; }
.legal a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.legal a:hover { color: var(--accent-hi); }
.legal .cmp-rule-h { margin-top: 40px; }
```

- [ ] **Step 2: Create `src/pages/privacy.astro`**

```astro
---
// src/pages/privacy.astro
// Privacy policy — honest disclosure: document content is 100% client-side and
// never uploaded, while anonymous product analytics (PostHog) is collected.
// Datasheet/blueprint aesthetic matching /alternatives and /vs pages.
import BaseLayout from "../layouts/BaseLayout.astro";
import SiteHeader from "../components/site/SiteHeader.astro";
import SiteFooter from "../components/site/SiteFooter.astro";
import "../styles/marketing.css";

const effectiveDate = "July 14, 2026";
const contactEmail = "artaza.developer@gmail.com";

const title = "Privacy policy — papersfly";
const description =
  "How papersfly handles your data: your documents are built and exported entirely in your browser and are never uploaded. We collect only anonymous product analytics — never your document content.";

const canonical = new URL(Astro.url.pathname, Astro.site).href;

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: new URL("/", Astro.site).href },
    { "@type": "ListItem", position: 2, name: "Privacy policy", item: canonical },
  ],
};
---

<BaseLayout title={title} description={description} extraJsonLd={[breadcrumb]}>
  <div class="site">
    <div class="wrap">
      <SiteHeader />
      <div class="cmp-hero">
        <div class="cmp-head">
          <span class="cmp-eyebrow">Legal · Privacy policy</span>
          <h1 class="cmp-title">Privacy <span class="accent">by architecture.</span></h1>
          <p class="cmp-lede">
            Your documents are built, rendered, and exported to PDF entirely in your
            browser — they are never uploaded to any server. The only thing we
            collect is anonymous product analytics, and never the content of what
            you write.
          </p>
          <span class="cmp-updated">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Effective {effectiveDate}
          </span>
        </div>
        <div class="cmp-tblock">
          <div class="r"><div class="c"><span class="k">Drawing</span><span class="v big">privacy</span></div><div class="c"><span class="k">Rev</span><span class="v">1.0</span></div></div>
          <div class="r"><div class="c"><span class="k">Sheet</span><span class="v">PRIVACY-00</span></div><div class="c"><span class="k">Scope</span><span class="v">papersfly</span></div></div>
          <div class="r"><div class="c"><span class="k">Effective</span><span class="v">{effectiveDate}</span></div><div class="c"><span class="k">Status</span><span class="v ok">Approved</span></div></div>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="wrap">
        <div class="legal">
          <h2>The short version</h2>
          <ul>
            <li><strong>Your documents never leave your device.</strong> Everything you type is edited, previewed, and turned into a PDF inside your browser. No résumé or invoice content is ever sent to a server.</li>
            <li><strong>No account, ever.</strong> There is no sign-up, no email, and no login required to use papersfly.</li>
            <li><strong>We collect anonymous product analytics only.</strong> We record which templates and style options are used so we can improve the product — never the text of your document.</li>
            <li><strong>Works offline.</strong> After the first load you can disconnect entirely and keep building and exporting.</li>
          </ul>

          <div class="cmp-rule-h"><span class="lbl">01 · Your documents</span><span class="ln"></span></div>
          <h2>Your documents stay in your browser</h2>
          <p>papersfly is a fully client-side application. When you edit a document, the live preview and the final true-vector PDF — with selectable text and embedded fonts — are generated entirely on your own device. There is no backend to receive your content, and nothing you type is transmitted over the network. After the initial page load the builder continues to work with no connection at all.</p>

          <div class="cmp-rule-h"><span class="lbl">02 · Analytics</span><span class="ln"></span></div>
          <h2>What we do collect — product analytics</h2>
          <p>To understand how papersfly is used and where to improve it, we use <a href="https://posthog.com" target="_blank" rel="noopener">PostHog</a>, a product-analytics service. It records a small set of interaction events. These events contain only which document type and style options you chose — <strong>never the content of your document</strong>. The events we send are:</p>
          <ul>
            <li>Selecting a template</li>
            <li>Changing a style option (colour, font, spacing, or size)</li>
            <li>Downloading a PDF — and, if it fails, an anonymous error report</li>
            <li>Importing an existing document</li>
            <li>Clicking the main call-to-action button</li>
          </ul>
          <p>As part of standard analytics, PostHog also collects technical metadata such as a randomly generated anonymous identifier, an approximate location derived from your IP address, your browser, device and operating system, and the current and referring page addresses. This data is not tied to your name or identity, and we do not attempt to re-identify you.</p>

          <div class="cmp-rule-h"><span class="lbl">03 · Cookies &amp; storage</span><span class="ln"></span></div>
          <h2>Cookies &amp; local storage</h2>
          <p>papersfly stores your light/dark theme preference in your browser's local storage so the site remembers it between visits. PostHog stores an anonymous identifier in your browser so repeat visits can be counted. We use no advertising cookies and do not track you across other websites.</p>

          <div class="cmp-rule-h"><span class="lbl">04 · Third parties</span><span class="ln"></span></div>
          <h2>Third parties</h2>
          <p>The only third party that receives any data is PostHog, which processes the anonymous analytics described above. The site itself is served as static files from a hosting/CDN provider. We do not sell your data, and no advertising network is involved.</p>

          <div class="cmp-rule-h"><span class="lbl">05 · Opting out</span><span class="ln"></span></div>
          <h2>Opting out of analytics</h2>
          <p>Analytics is never required to use papersfly. If you would rather not be counted, you can use a tracker-blocking browser extension or block the analytics domain — the builder will continue to work fully, including offline. Because the analytics is anonymous, no personal profile is created either way.</p>

          <div class="cmp-rule-h"><span class="lbl">06 · Retention &amp; rights</span><span class="ln"></span></div>
          <h2>Data retention &amp; your rights</h2>
          <p>The analytics data we collect is anonymous and retained only for as long as it is useful for understanding product usage. Because it is not linked to your identity, it cannot ordinarily be traced back to you. If you have a question about your data or wish to make a request, contact us using the details below and we will do our best to help.</p>

          <div class="cmp-rule-h"><span class="lbl">07 · Changes</span><span class="ln"></span></div>
          <h2>Changes to this policy</h2>
          <p>We may update this policy from time to time. When we do, we will revise the effective date shown at the top of the page. This policy was last updated on {effectiveDate}.</p>

          <div class="cmp-rule-h"><span class="lbl">08 · Contact</span><span class="ln"></span></div>
          <h2>Contact</h2>
          <p>Questions about this policy or your privacy? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</BaseLayout>
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm build`
Expected: `astro check` reports **0 errors**, then the build completes and prints a line for `/privacy` (e.g. `▶ src/pages/privacy.astro → /privacy/index.html`). Confirm `dist/privacy/index.html` exists:

Run: `ls dist/privacy/index.html`
Expected: the path prints (file exists).

- [ ] **Step 4: Write the browser verification script**

Create `/tmp/claude-1000/-home-artaza-sameen-workshop-papersfly/5936c5ec-d691-41a8-ad86-a726ab834fb6/scratchpad/verify-privacy.mjs` (this is a temporary/scratchpad helper, NOT committed to the repo):

```js
// Verify /privacy against a running preview server in both themes.
// Usage: node verify-privacy.mjs [baseUrl]   (default http://localhost:4321)
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

function chromePath() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (env) return env;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome found — set PUPPETEER_EXECUTABLE_PATH");
  return found;
}

const base = process.argv[2] || "http://localhost:4321";
const browser = await puppeteer.launch({ executablePath: chromePath() });
let failures = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); if (!ok) failures++; };

try {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 1400, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((t) => {
      localStorage.setItem("papersfly-theme", t);
    }, theme);
    await page.goto(`${base}/privacy`, { waitUntil: "networkidle0" });

    const probe = await page.evaluate(() => ({
      isDark: document.documentElement.classList.contains("dark"),
      h1: document.querySelector("h1.cmp-title")?.textContent?.trim() || null,
      hasLegal: !!document.querySelector(".legal"),
      h2Count: document.querySelectorAll(".legal h2").length,
      hasHeaderNav: !!document.querySelector(".nav"),
      hasFooter: !!document.querySelector("footer.foot"),
      hasEmail: !!document.querySelector('a[href="mailto:artaza.developer@gmail.com"]'),
      mentionsPosthog: /posthog/i.test(document.querySelector(".legal")?.textContent || ""),
    }));

    check(`[${theme}] theme applied`, probe.isDark === (theme === "dark"));
    check(`[${theme}] h1 present`, !!probe.h1);
    check(`[${theme}] .legal present`, probe.hasLegal);
    check(`[${theme}] all 9 h2 sections`, probe.h2Count === 9);
    check(`[${theme}] SiteHeader present`, probe.hasHeaderNav);
    check(`[${theme}] SiteFooter present`, probe.hasFooter);
    check(`[${theme}] contact email link`, probe.hasEmail);
    check(`[${theme}] discloses PostHog`, probe.mentionsPosthog);

    const out = `/tmp/claude-1000/-home-artaza-sameen-workshop-papersfly/5936c5ec-d691-41a8-ad86-a726ab834fb6/scratchpad/privacy-${theme}.png`;
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  screenshot: ${out}`);
    await page.close();
  }
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
```

- [ ] **Step 5: Run the preview server and verify the page**

Start the preview server in the background:

Run: `pnpm preview` (background) — note the URL it prints (default `http://localhost:4321`).

Then run the verifier (adjust the base URL if the port differs):

Run: `node /tmp/claude-1000/-home-artaza-sameen-workshop-papersfly/5936c5ec-d691-41a8-ad86-a726ab834fb6/scratchpad/verify-privacy.mjs http://localhost:4321`
Expected: every line prints `PASS` (18 checks total across both themes) and the process exits 0. Open `privacy-light.png` / `privacy-dark.png` to confirm the datasheet hero, prose column, and section rules render correctly and are legible in both themes.

Stop the preview server when done.

- [ ] **Step 6: Checkpoint (user commits)**

Do NOT commit. Pause for review of `src/pages/privacy.astro` and the `.legal` CSS. The user will commit.

---

## Task 2: Footer link + honesty copy tweak

**Files:**
- Modify: `src/components/site/SiteFooter.astro` (the `foot-row`)
- Modify: `src/styles/marketing.css` (append `.foot-legal` style)

**Interfaces:**
- Consumes: existing footer markup `<div class="wrap foot-row">` and class `foot-note`.
- Produces: a footer link `<a class="foot-legal" href="/privacy">` and CSS class `.foot-legal`.

- [ ] **Step 1: Update the footer row in `src/components/site/SiteFooter.astro`**

Replace this block:

```astro
  <div class="wrap foot-row">
    <small class="foot-note">Free &amp; open source · No data collected</small>
  </div>
```

with:

```astro
  <div class="wrap foot-row">
    <small class="foot-note">Free &amp; open source · Your documents stay on your device</small>
    <a class="foot-legal" href="/privacy">Privacy</a>
  </div>
```

- [ ] **Step 2: Append the `.foot-legal` style to `src/styles/marketing.css`**

Add at the end of the file (after the `.legal` block from Task 1):

```css

/* Footer legal link — matches the footer note styling. */
.foot-legal { color: var(--faint); font-family: var(--f-mono); font-size: 10.5px; letter-spacing: 0.06em; text-decoration: none; }
.foot-legal:hover { color: var(--ink); }
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm build`
Expected: `astro check` reports **0 errors** and the build completes.

- [ ] **Step 4: Verify footer wiring in the browser**

Start `pnpm preview` (background) if not already running, then check the footer on any page (the footer is shared). Run:

```bash
node -e '
const { existsSync } = require("node:fs");
(async () => {
  const puppeteer = (await import("puppeteer-core")).default;
  const p = ["/usr/bin/google-chrome","/usr/bin/chromium-browser","/usr/bin/chromium"].find(existsSync);
  const b = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || p });
  const page = await b.newPage();
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle0" });
  const r = await page.evaluate(() => ({
    link: document.querySelector("footer.foot .foot-legal")?.getAttribute("href"),
    note: document.querySelector("footer.foot .foot-note")?.textContent?.trim(),
  }));
  console.log(r);
  const ok = r.link === "/privacy" && /stay on your device/.test(r.note || "") && !/No data collected/.test(r.note || "");
  console.log(ok ? "PASS footer wiring" : "FAIL footer wiring");
  await b.close();
  process.exit(ok ? 0 : 1);
})();
'
```

Expected: prints `{ link: '/privacy', note: 'Free & open source · Your documents stay on your device' }` and `PASS footer wiring` (exit 0). Then confirm navigating to the footer link works: `node .../verify-privacy.mjs` from Task 1 still passes.

- [ ] **Step 5: Confirm `/privacy` is in the generated sitemap**

Run: `grep -r "/privacy" dist/sitemap-0.xml dist/sitemap-index.xml 2>/dev/null`
Expected: at least one match — a `<loc>…/privacy</loc>` entry (the `@astrojs/sitemap` integration auto-includes the new static page). If no match, verify the build ran after the page was created.

Stop the preview server when done.

- [ ] **Step 6: Checkpoint (user commits)**

Do NOT commit. Pause for review of the footer change. The user will commit all work.

---

## Self-Review

**1. Spec coverage:**
- Route `/privacy`, BaseLayout + SiteHeader/SiteFooter, BreadcrumbList JSON-LD, effectiveDate → Task 1 Step 2. ✔
- Datasheet visual treatment (cmp-hero/cmp-tblock/cmp-rule-h) + `.legal` CSS → Task 1 Steps 1–2. ✔
- All 9 content sections (short version, documents, analytics w/ event list, cookies, third parties, opting out, retention & rights, changes, contact) → Task 1 Step 2 body; count asserted (9 h2) in Step 5. ✔
- Honest analytics disclosure + "never document text" + PostHog link + contact email → Task 1 Step 2. ✔
- Footer `/privacy` link + copy tweak → Task 2 Steps 1–2. ✔
- Header left unchanged → Global Constraints (explicitly not modified). ✔
- Verification: `pnpm build`, browser harness (light+dark), sitemap → Task 1 Steps 3/5, Task 2 Steps 3/4/5. ✔
- No commits (user preference) → Global Constraints + checkpoint steps. ✔

**2. Placeholder scan:** No TBD/TODO; all CSS, page markup, and verification scripts are complete and inline. ✔

**3. Type consistency:** Page uses only `BaseLayout` props that exist (`title`, `description`, `extraJsonLd`); classes (`cmp-*`, `legal`, `foot-legal`) are either pre-existing (verified in `marketing.css`) or created in this plan. The verifier asserts `.legal h2` count = 9, matching the 9 `<h2>` in the page body. `.foot-legal` selector in CSS matches the class used in the footer markup. ✔
