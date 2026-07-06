/**
 * The font library: the SINGLE SOURCE OF TRUTH for every selectable font.
 *
 * This module is pure metadata (no base64). Three consumers derive from it so
 * they cannot drift: the FontPicker options, the preview @font-face rules
 * (fonts.css), and the PDF embedding (registerFonts.ts). Each weight's `file`
 * name is BOTH the jsPDF VFS key and the @font-face src.url — keep them equal.
 *
 * Every family ships 400/600/700 so any font renders correctly at any role the
 * template uses (body 400, headings/labels 600, name 700). All families are
 * subset to the Latin set in coverage.ts.
 */
export type FontId = "inter" | "sourceSerif" | "lora" | "playfair" | "plexSans" | "plexMono";
export type FontCategory = "sans" | "serif" | "mono";
export type FontWeight = 400 | 600 | 700;

export interface FontWeightFile {
  weight: FontWeight;
  /** Subset TTF file name in src/fonts/ — also the VFS key and @font-face url. */
  file: string;
}

export interface FontDef {
  id: FontId;
  /** Display name shown in the picker. */
  name: string;
  category: FontCategory;
  /** The font-family name used in CSS / @font-face. */
  cssFamily: string;
  /** Full CSS font-family stack (incl. system fallback) applied on override. */
  stack: string;
  weights: FontWeightFile[];
}

export const FONT_LIBRARY: FontDef[] = [
  {
    id: "inter", name: "Inter", category: "sans",
    cssFamily: "Inter", stack: '"Inter", system-ui, sans-serif',
    weights: [
      { weight: 400, file: "inter-regular.ttf" },
      { weight: 600, file: "inter-semibold.ttf" },
      { weight: 700, file: "inter-bold.ttf" },
    ],
  },
  {
    id: "sourceSerif", name: "Source Serif", category: "serif",
    cssFamily: "SourceSerif", stack: '"SourceSerif", Georgia, serif',
    weights: [
      { weight: 400, file: "serif-regular.ttf" },
      { weight: 600, file: "serif-semibold.ttf" },
      { weight: 700, file: "serif-bold.ttf" },
    ],
  },
  {
    id: "lora", name: "Lora", category: "serif",
    cssFamily: "Lora", stack: '"Lora", Georgia, serif',
    weights: [
      { weight: 400, file: "lora-regular.ttf" },
      { weight: 600, file: "lora-semibold.ttf" },
      { weight: 700, file: "lora-bold.ttf" },
    ],
  },
  {
    id: "playfair", name: "Playfair Display", category: "serif",
    cssFamily: "Playfair Display", stack: '"Playfair Display", Georgia, serif',
    weights: [
      { weight: 400, file: "playfair-regular.ttf" },
      { weight: 600, file: "playfair-semibold.ttf" },
      { weight: 700, file: "playfair-bold.ttf" },
    ],
  },
  {
    id: "plexSans", name: "IBM Plex Sans", category: "sans",
    cssFamily: "IBM Plex Sans", stack: '"IBM Plex Sans", system-ui, sans-serif',
    weights: [
      { weight: 400, file: "plexsans-regular.ttf" },
      { weight: 600, file: "plexsans-semibold.ttf" },
      { weight: 700, file: "plexsans-bold.ttf" },
    ],
  },
  {
    id: "plexMono", name: "IBM Plex Mono", category: "mono",
    cssFamily: "IBM Plex Mono", stack: '"IBM Plex Mono", ui-monospace, monospace',
    weights: [
      { weight: 400, file: "plexmono-regular.ttf" },
      { weight: 600, file: "plexmono-semibold.ttf" },
      { weight: 700, file: "plexmono-bold.ttf" },
    ],
  },
];

const BY_ID = new Map<string, FontDef>(FONT_LIBRARY.map((f) => [f.id, f]));

export function getFont(id: string): FontDef | undefined {
  return BY_ID.get(id);
}

export function fontStack(id: string): string {
  return getFont(id)?.stack ?? "inherit";
}

export const FONT_CATEGORIES: ReadonlyArray<{ key: FontCategory; title: string }> = [
  { key: "sans", title: "Sans" },
  { key: "serif", title: "Serif" },
  { key: "mono", title: "Mono" },
];

export function fontsByCategory(cat: FontCategory): FontDef[] {
  return FONT_LIBRARY.filter((f) => f.category === cat);
}
