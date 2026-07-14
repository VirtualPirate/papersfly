# Vector resume Builder

A fully **client-side** resume builder. Fill in your content, watch a live HTML/CSS
preview, and click **Download PDF** to get a **true-vector** PDF (`resume.pdf`) — real
selectable, searchable text and embedded fonts, never a screenshot. No backend, no server,
no network call to generate or download the file. It works offline after the first load.

```bash
pnpm install
pnpm dev        # Astro dev server — open the printed localhost URL
```

Other scripts:

```bash
pnpm build       # astro check (type-check) + static production build into dist/
pnpm preview     # serve the production build locally
pnpm gen:fonts   # regenerate the embedded base64 font module from the TTFs
pnpm gen:og      # regenerate public/og-image.png (social card)
```

## Hosting & SEO

The app is built with **Astro** (static output). The resume tool itself is a browser-only
React island mounted with `client:only="react"` — Astro renders no application logic on the
server; it renders the SEO-rich `<head>` and a lightweight pre-hydration skeleton. All SEO
lives in that statically rendered `<head>`: `<title>`, description, canonical, Open Graph,
Twitter card, and a JSON-LD `WebApplication` schema. The build also emits an auto-generated
`sitemap-index.xml` (via `@astrojs/sitemap`) and a `robots.txt` that points at it.

**Set the production domain in one place:** the `SITE` constant (the `site` option) in
[`astro.config.mjs`](astro.config.mjs). Canonical URLs, Open Graph/Twitter image URLs, the
sitemap, and `robots.txt` all derive from it — `https://example.com` is a placeholder until
the real domain is chosen. For a subpath deploy (e.g. a GitHub Pages project site), also set
`base`.

Output is fully static (`dist/`), so it deploys to any static host with no adapter or
server runtime required.

## How it produces a vector PDF, client-side, with no backend (the short version)

The resume is authored **once** as an HTML/CSS template (`ClassicPreview` +
[`classic.css`](src/templates/classic/classic.css)), and every measurement — page size,
margins, font sizes, line heights, gaps — is expressed in **points (pt)** in one shared
[`theme.ts`](src/theme/theme.ts), so the page renders at its true physical size
(612pt × 792pt). On download, [`download.ts`](src/pdf/download.ts) hands that rendered DOM
to **jsPDF's `doc.html()`**, which walks the elements and emits **native, selectable
vector text** for every run (plus vector strokes for the rules) — not a rasterized image.
Custom fonts come through because the TTFs are embedded with `addFont` and mapped onto the
CSS via the `fontFaces` option (see [`registerFonts.ts`](src/fonts/registerFonts.ts)), so
the PDF carries the real **Inter / Source Serif** glyph programs (`/FontFile2`) instead of
falling back to Helvetica. `doc.save("resume.pdf")` serializes to a Blob and clicks a
temporary object-URL `<a download>` — a direct download with **no `window.print()`, no
print dialog, and no server round-trip**.

## Architecture

```
src/
  theme/theme.ts                  Shared design tokens in pt — the single source of truth
                                  for the layout (also exposed as CSS custom properties).
  data/resume.ts                  ResumeData types + realistic sample content. Content only;
                                  no design lives here.
  templates/
    types.ts                      Template = { id, name, Preview } over ResumeData.
    registry.ts                   List of templates. Add a design = add a module here.
    classic/
      classic.css                 The DESIGN, authored in HTML/CSS (pt units via theme vars).
      ClassicPreview.tsx          Renders ResumeData -> HTML/CSS. This IS the PDF source.
      index.ts                    Bundles the preview into one Template.
  fonts/
    *.ttf                         Subset (Latin) Inter + Source Serif 4, OFL-licensed.
    fonts.css                     @font-face for the preview (same TTFs as the PDF).
    fontData.ts                   AUTO-GENERATED base64 of the TTFs for jsPDF embedding.
    registerFonts.ts              Embeds the fonts (addFont) + the doc.html() fontFaces map.
  pdf/
    download.ts                   Renders the live DOM via doc.html() -> direct Blob download.
  components/EditorForm.tsx        Controlled form; every edit -> new ResumeData -> live update.
  App.tsx                          Editor + scaled live preview + an offscreen, true-size copy
                                   used as the PDF capture source.
scripts/
  gen-fonts.mjs                   TTF -> base64 module (run via npm run gen:fonts).
  inspect-pdf.mjs                 Forensic vector-vs-raster classifier for any PDF (see below).
```

**Content vs. design separation.** `ResumeData` (content) flows into a `Template` (design).
Editing the form produces a new immutable `ResumeData`, which re-renders the preview and
feeds the PDF. Adding a new design means adding one template module (a `Preview` component)
to `registry.ts`; content never changes.

**One source of truth.** Unlike a hand-drawn PDF writer, the design is expressed exactly
once — in HTML/CSS. `doc.html()` captures the same rendered markup the preview shows, so
there is no second renderer to keep in sync.

**Why an offscreen capture copy?** `doc.html()` reads layout from a *laid-out, untransformed*
DOM. The visible preview is wrapped in a `transform: scale()` to fit the screen, which would
distort the capture, so `App` also renders a hidden, true-size copy of the page and points
`doc.html()` at that. `download.ts` neutralizes the preview's full-page `min-height` inline
on the captured node (the clone `doc.html()` makes drops ancestor selectors) so a one-page
resume doesn't spill a trailing blank page on the 792pt boundary.

## Why `doc.html()` (a DOM-to-PDF renderer)

`doc.html()` lets us author the design once in HTML/CSS and get selectable, embedded-font
vector text out the other side — no parallel hand-mapped layout to maintain. The trade-offs,
which are acceptable for a client-side resume download, are:

- **Browser-only.** It needs a real, laid-out DOM (computed styles, geometry), so PDF
  generation can't run headless in Node. (This is why there is no Node `verify:pdf` script;
  see Verification.)
- **Partial CSS.** The native renderer handles document-flow layouts (blocks, text,
  spacing) well; it does **not** fully support flexbox/grid/transforms, so the template is
  authored in plain block flow.
- **Pagination control is coarser** than a hand-mapped writer (see Notes & limitations).

Explicitly **not** used: html2pdf.js or any screenshot approach that flattens the page into
a non-selectable image. Note that jsPDF's `doc.html()` *does* always load and run
html2canvas — but as its DOM layout/rendering **engine**, drawing through jsPDF's vector
`context2d` (whose text path emits real `pdf.text()` glyph runs), not onto a raster canvas.
So the output is selectable vector text, verified by **659 text-show operators and zero
`/Subtype /Image`** in the sample export.

## Fonts

Typography uses **Inter** (sans body, weights 400/600) and **Source Serif 4** (the serif
name, weight 700), both OFL-licensed (licenses in [`src/fonts/`](src/fonts)). The TTFs are
**subset to Latin + typographic punctuation** (~33–40 KB each) so both the bundle and the
embedded font program in each PDF stay small. The same TTFs power the on-screen `@font-face`
and the PDF embedding (via `addFont` + the `doc.html()` `fontFaces` map), so screen and PDF
typography match. `fontData.ts` (base64) is generated from the TTFs by `npm run gen:fonts`.

Because the fonts are subset to Latin, characters from other scripts (CJK, Cyrillic, Greek,
etc.) have no glyph and would be dropped from the PDF. Rather than fail silently, the app
scans the content ([`coverage.ts`](src/fonts/coverage.ts)) and shows a warning bar listing
any unsupported characters. To support more scripts, swap in fuller fonts (or a fallback
chain) and widen the `pyftsubset` unicode set in the font-prep step.

## Notes & limitations

- **Pagination.** `doc.html()` paginates automatically (`autoPaging: "text"`). The bundled
  sample fits one page, which is the supported case. Page margins come from the template's
  own padding, applied **once** around the whole block — so a resume that overflows onto a
  second page keeps a top margin only on page 1 and a bottom margin only on the last page;
  intermediate breaks have no margin and content can run to the sheet edge. Doing multi-page
  properly means moving margins to `doc.html()`'s per-page `margin` option; until then treat
  more than one page as degraded.
- **Single renderer.** The PDF is captured from the live HTML/CSS, so there is no separate
  PDF layout to drift out of sync — at the cost of being bound to what `doc.html()` can
  render (see "Why `doc.html()`").

## Verification

Because generation is browser-only, there is no headless Node check. To confirm an exported
PDF is true vector with embedded fonts, download `resume.pdf` and inspect it:

```bash
pdffonts resume.pdf     # Inter / SourceSerif -> "CID TrueType ... emb yes ... uni yes"
pdftotext resume.pdf -  # prints the resume text, proving it is real text, not an image
node scripts/inspect-pdf.mjs resume.pdf   # pdf.js-based: pages, embedded fonts, /Image, text
```

`scripts/inspect-pdf.mjs` reports the producer, embedded-font subtypes (`/FontFile2`,
`CIDFontType2`/`Type0`), the count of text-drawing vs image-paint operators, the extracted
text, and a VECTOR/RASTER verdict — the same forensic signals used to validate this build
(single page, embedded Inter + Source Serif, zero rasterized images, and ~2k chars of
selectable text for the bundled sample).
