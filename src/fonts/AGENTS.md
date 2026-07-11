# Fonts — vendoring & embedding guide

Guidance for coding agents adding or replacing a font. Read the **root
`AGENTS.md`** first (client-side, true-vector PDF via `doc.html()`, offline after
first load). This file is the practical how-to for this folder, and the rules
below exist because breaking one silently corrupts the exported PDF.

## Layout

```
src/fonts/
  library.ts          SINGLE SOURCE OF TRUTH: FontId → { cssFamily, stack, weights[{weight,file}] }
  fonts.css           @font-face for the on-screen PREVIEW (loads the .ttf as static assets)
  coverage.ts         the Latin unicode set the subsets cover + the runtime "missing glyph" warning
  registerFonts.ts    embeds the base64 into jsPDF (VFS) + builds the doc.html() fontFaces map
  <family>-<weight>.ttf   the vendored, Latin-SUBSET, STATIC weight files (the input)
  fontData/<id>.ts    AUTO-GENERATED base64 of those TTFs (the OUTPUT the PDF actually embeds)
  *-LICENSE.txt       OFL license, one per family (required)
  saira-*.woff2       UI-ONLY display face for the app chrome — NEVER embedded in the PDF
```

The `.ttf` files are the *input*; **`fontData/*.ts` (base64) is what jsPDF
embeds at runtime — never the `.ttf` directly.** So a `.ttf` change does nothing
until you run `pnpm gen:fonts` to regenerate the matching `.ts`. They move
together, always.

## The rules (every embedded weight must satisfy all of these)

1. **Static, never variable.** The file must have **no `fvar` table**. If the
   OFL source ships only a variable font, *instance* it to the target weight
   first (pin every axis) — do **not** just subset the variable font.
   > Why: a variable font with no axis value set renders its **default master
   > (usually 400)**. `@font-face`/jsPDF ask for the family with no
   > `font-variation-settings`, so a "bold" variable file draws thin — bold and
   > semibold silently vanish. This is the exact bug that motivated this file.

2. **Weight metadata matches the slot.** OS/2 `usWeightClass` must equal the
   `weight` declared in `library.ts` — regular = **400**, semibold = **600**,
   bold = **700** — and the glyph outlines must actually *be* that weight (three
   visibly distinct strokes), not the regular outlines relabelled.

3. **Right typeface in the slot.** The name-table family must be the intended
   font (an Inter file must not sit in a Lora slot).

4. **Latin subset, exact set.** Subset to the unicode set in `coverage.ts`
   `SUPPORTED_RANGES`:
   `U+0020-007E,U+00A0-024F,U+2010-2027,U+2122,U+2192,U+2212,U+20AC,U+25CF`.
   If you change the subset, update `coverage.ts` in the same commit (its warning
   logic must match what the fonts can render).

5. **`file` name is load-bearing and must stay equal across three places.** The
   `file` field in `library.ts` is used verbatim as (a) the jsPDF VFS key, (b) the
   `addFont` path, and (c) the `@font-face src.url` in both `fonts.css` and
   `registerFonts.ts`' `pdfFontFaces`. A mismatch makes jsPDF attempt a network
   fetch → fails offline → falls back to Helvetica.

6. **Every family ships 400 / 600 / 700** — templates use body 400, headings /
   labels 600, name 700. A missing weight falls back and breaks the design.

7. **Regenerate after any `.ttf` change:** `pnpm gen:fonts`.

## Recipe: add or replace a weight

```bash
# 1. Get a STATIC TTF at the target weight from the OFL source, OR instance a
#    variable font to a static weight (pins all axes, drops fvar):
python3 -m fontTools.varLib.instancer "Family[wght].ttf" wght=700 -o /tmp/f-700.ttf

# 2. Subset to the Latin set (weight → file: 400=regular, 600=semibold, 700=bold):
python3 -m fontTools.subset /tmp/f-700.ttf \
  --unicodes="U+0020-007E,U+00A0-024F,U+2010-2027,U+2122,U+2192,U+2212,U+20AC,U+25CF" \
  --layout-features="kern,liga,calt" \
  --output-file=src/fonts/<family>-bold.ttf

# 3. Regenerate the embedded base64, then run the gates:
pnpm gen:fonts
pnpm test                       # fontWeights.test.ts enforces rules 1–3
pnpm build && pnpm verify:pdf   # no fallback/raster, weights not collapsed, résumés stay 1 page
```

Sanity-check a file directly:
`python3 -c "from fontTools import ttLib; t=ttLib.TTFont('src/fonts/<f>.ttf'); print('fvar' in t, t['OS/2'].usWeightClass, t['name'].getDebugName(1))"`
→ expect `False <weight> <TypefaceName>`.

**New family** also needs: an `*-LICENSE.txt`, a `FontDef` in `library.ts`, three
`@font-face` rules in `fonts.css`, a `FAMILIES` entry in `scripts/gen-fonts.mjs`,
and the `FontId` wired in `fontData/index.ts` `FONT_LOADERS`.

## Enforcement (do not remove without a replacement)

- `fontWeights.test.ts` — per file: static (no `fvar`), correct `usWeightClass`,
  correct typeface. Reads the embedded base64, so it validates what actually ships.
- `../pdf/textSizeAdjust.test.ts` — the mobile font-boosting guard (inline
  `text-size-adjust` pin on the capture root; class rules alone don't survive
  jsPDF's html2canvas clone).
- `scripts/verify-pdfs.mjs` → `inspect-pdf.mjs --strict --min-weights=2`
  (+`--max-pages=1` for résumés): every exported PDF is clean vector, no
  non-embedded fallback font draws text, no weight collapse, résumés stay one page.
  This is browser-only and cannot run in vitest, so it is the CI backstop.
