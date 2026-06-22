# Vector Résumé Builder

A fully **client-side** résumé builder. Fill in your content, watch a live HTML/CSS
preview, and click **Download PDF** to get a **true-vector** PDF (`resume.pdf`) — real
selectable, searchable text and vector strokes, never a screenshot. No backend, no server,
no network call to generate or download the file. It works offline after the first load.

```bash
npm install
npm run dev      # open the printed localhost URL
```

Other scripts:

```bash
npm run build        # type-check + static production build into dist/
npm run preview      # serve the production build locally
npm run verify:pdf   # generate resume.pdf in Node and assert it is true vector
npm run gen:fonts    # regenerate the embedded base64 font module from the TTFs
```

## How it produces a vector PDF, client-side, with no backend (the short version)

The design is authored as an **HTML/CSS template** and every measurement — page size,
margins, font sizes, line heights, gaps — is expressed in **points (pt)** in one shared
[`theme.ts`](src/theme/theme.ts), so the CSS preview (`pt` is a real CSS unit) and the PDF
writer draw from the exact same numbers. On download, [`buildPdf`](src/pdf/buildPdf.ts)
creates a **jsPDF** document, registers two **TTF fonts embedded as base64** in the JS
bundle (so font setup makes zero network requests), and the template's
[`classicToPdf`](src/templates/classic/classicPdf.ts) walks the content top-to-bottom
emitting jsPDF `text`/`line`/`circle` calls — so glyphs become embedded-font outlines and
rules become vector strokes. `doc.save("resume.pdf")` serializes the document to a Blob and
clicks a temporary object-URL `<a download>` — a direct download with **no `window.print()`,
no print dialog, and no server round-trip**. Because the text is real font-backed text (not
a rasterized image), it stays selectable, searchable, and crisp at any zoom.

## Architecture

```
src/
  theme/theme.ts                  Shared design tokens in pt — the single source of truth
                                  for both renderers (also exposed as CSS custom properties).
  data/resume.ts                  ResumeData types + realistic sample content. Content only;
                                  no design lives here.
  templates/
    types.ts                      Template = { id, name, Preview, toPdf } over ResumeData.
    registry.ts                   List of templates. Add a design = add a module here.
    classic/
      classic.css                 The DESIGN, authored in HTML/CSS (pt units via theme vars).
      ClassicPreview.tsx          Renders ResumeData -> live HTML/CSS preview.
      classicPdf.ts               Maps the SAME layout -> jsPDF vector draw calls.
      index.ts                    Bundles the two into one Template.
  fonts/
    *.ttf                         Subset (Latin) Inter + Source Serif 4, OFL-licensed.
    fonts.css                     @font-face for the preview (same TTFs as the PDF).
    fontData.ts                   AUTO-GENERATED base64 of the TTFs for jsPDF embedding.
    registerFonts.ts              Registers the embedded fonts onto a jsPDF doc.
  pdf/
    buildPdf.ts                   Pure, isomorphic: (template, data) -> jsPDF document.
    download.ts                   buildPdf + doc.save() -> direct Blob download.
  components/EditorForm.tsx        Controlled form; every edit -> new ResumeData -> live update.
  App.tsx                          Two-pane shell: editor + scaled live preview + Download.
scripts/
  gen-fonts.mjs                   TTF -> base64 module (run via npm run gen:fonts).
  verify-pdf.mjs                  Headless true-vector verification (npm run verify:pdf).
```

**Content vs. design separation.** `ResumeData` (content) flows into a `Template` (design).
Editing the form produces a new immutable `ResumeData`, which re-renders the preview and
feeds the PDF writer. Adding a new design means adding one template module (a `Preview`
component + a `toPdf` writer) to `registry.ts` — content never changes.

**Why two renderers from one theme?** The PDF is not a screenshot of the DOM, so it can't be
"the same" automatically. Instead both renderers consume the same pt-based tokens: the CSS
uses them as custom properties (the preview page is rendered at true physical size,
612×792pt = 816×1056px, then scaled to fit the screen), and the jsPDF writer uses the same
numbers as drawing coordinates. Keep them in sync by changing tokens in one place.

## Why jsPDF (and not dompdf.js / a DOM-to-PDF parser)

The spec allowed either jsPDF with a hand-mapped layout, or a DOM/CSS-parsing library like
dompdf.js. I chose **jsPDF as the PDF writer** because it reliably delivers all of the hard
requirements *today*: true-vector embedded-font text, a direct Blob download, and fully
offline operation, with a stable font-embedding path. DOM-parsing-to-PDF libraries get you
closer to "render the literal template" but are newer and less predictable around custom
font embedding and CSS edge cases. The trade-off is that the design must be expressed twice
(CSS + jsPDF mapping); the shared pt-token system keeps that cheap and the two outputs
aligned. Explicitly **not used**: html2canvas / html2pdf.js / any screenshot-to-canvas
approach (those rasterize), and any server-side rendering. jsPDF's optional raster deps
(`html2canvas`, `dompurify`, `canvg`, reachable only via the unused `doc.html()`) are
stubbed out in [`vite.config.ts`](vite.config.ts) so they never enter the bundle.

## Fonts

Typography uses **Inter** (sans body) and **Source Serif 4** (the serif name), both
OFL-licensed (licenses in [`src/fonts/`](src/fonts)). The TTFs are **subset to Latin +
typographic punctuation** (~33–40 KB each) so both the bundle and the embedded font program
in each PDF stay small. The same TTFs power the on-screen `@font-face` and the PDF embedding,
so screen and print typography match. `fontData.ts` (base64) is generated from the TTFs by
`npm run gen:fonts`.

Because the fonts are subset to Latin, characters from other scripts (CJK, Cyrillic, Greek,
etc.) have no glyph and would be dropped from the PDF. Rather than fail silently, the app
scans the content ([`coverage.ts`](src/fonts/coverage.ts)) and shows a warning bar listing
any unsupported characters. To support more scripts, swap in fuller fonts (or a fallback
chain) and widen the `pyftsubset` unicode set in the font-prep step.

## Notes & limitations

- **Pagination.** The PDF writer breaks across pages (it keeps whole lines/bullets together,
  reserves the date column, and never strands a section heading). The on-screen preview is a
  single continuous sheet, so for content that runs onto a second page the preview shows
  everything in one tall sheet while the PDF is the paginated source of truth. The bundled
  sample fits one page.
- **Two renderers.** The PDF is not a DOM screenshot, so the design is expressed twice (CSS +
  jsPDF), both driven by the shared pt tokens. They aim to mirror, not be pixel-identical.

## Verification

`npm run verify:pdf` runs the app's real `buildPdf` in Node (no browser), writes
`resume.pdf`, and asserts:

- `/Producer` is `jsPDF 2.5.2` (metadata names the library);
- `/FontFile2` is present — the TrueType program is embedded (CID TrueType, Identity-H);
- there is **no** `/Subtype /Image` — nothing is rasterized;
- **pdf.js** extracts the real text (selectable / searchable), matching expected strings.

See the latest run's results in the project notes; on a clean machine you can reproduce
selectable-text and embedding evidence with poppler too:

```bash
pdffonts resume.pdf     # Inter / SourceSerif -> "CID TrueType ... emb yes ... uni yes"
pdftotext resume.pdf -  # prints the résumé text, proving it is real text, not an image
```

Browser checks performed during development: generating the PDF fired **zero** network
requests (instrumented `fetch`/`XHR`/`sendBeacon` + DevTools network panel), and generation
runs entirely from in-memory data + embedded fonts, so it works with the network
disconnected.
