/**
 * Template variants — design metadata kept SEPARATE from ResumeData (same as
 * per-field font overrides). A Variant selects one color scheme + one font
 * pairing; resolveVariant turns that selection into concrete CSS values for
 * themeCssVars(), and resolveVariantFontIds lists the fonts the PDF must embed.
 *
 * "display" fills the --f-serif slot (the name/display font); "body" fills the
 * --f-sans slot (body text + headings). The role names are intentional: Modern
 * and Mono put a sans/mono face in the display slot.
 */
import { fontStack, type FontId } from "../fonts/library";

export interface ColorScheme {
  id: string;
  name: string;
  /** Accent color (--c-accent): headline, section headings, org names, bullets. */
  accent: string;
}

export interface FontPairing {
  id: string;
  name: string;
  /** Display/name font — fills the --f-serif slot. */
  display: FontId;
  /** Body + headings font — fills the --f-sans slot. */
  body: FontId;
}

export interface SpacingPreset {
  id: string;
  name: string;
  /** Unitless multiplier applied to each template's base section gap. */
  scale: number;
}

export interface SizePreset {
  id: string;
  name: string;
  /** Unitless multiplier applied to every font size + leading. */
  scale: number;
}

/** The current variant selection. */
export interface Variant {
  colorId: string;
  fontId: string;
  /** Section-spacing preset id; absent ⇒ DEFAULT_SPACING_ID (scale 1). */
  spacingId?: string;
  /** Font-size preset id; absent ⇒ DEFAULT_SIZE_ID (scale 1). */
  sizeId?: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: "navy", name: "Navy", accent: "#1f3a5f" },
  { id: "charcoal", name: "Charcoal", accent: "#2b2f36" },
  { id: "burgundy", name: "Burgundy", accent: "#7c2d3a" },
  { id: "forest", name: "Forest", accent: "#285043" },
];

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "classic", name: "Classic", display: "sourceSerif", body: "inter" },
  { id: "editorial", name: "Editorial", display: "playfair", body: "inter" },
  { id: "modern", name: "Modern", display: "plexSans", body: "plexSans" },
  { id: "mono", name: "Mono", display: "plexMono", body: "inter" },
];

export const SPACING_PRESETS: SpacingPreset[] = [
  { id: "compact", name: "Compact", scale: 0.5 },
  { id: "default", name: "Default", scale: 1 },
  { id: "relaxed", name: "Relaxed", scale: 1.75 },
];

export const SIZE_PRESETS: SizePreset[] = [
  { id: "small", name: "Small", scale: 0.9 },
  { id: "medium", name: "Medium", scale: 1 },
  { id: "large", name: "Large", scale: 1.1 },
];

export const DEFAULT_VARIANT: Variant = { colorId: "navy", fontId: "classic" };

export const DEFAULT_SPACING_ID = "default";

export const DEFAULT_SIZE_ID = "medium";

const COLOR_BY_ID = new Map(COLOR_SCHEMES.map((c) => [c.id, c]));
const FONT_BY_ID = new Map(FONT_PAIRINGS.map((f) => [f.id, f]));
const SPACING_BY_ID = new Map(SPACING_PRESETS.map((s) => [s.id, s]));
const SIZE_BY_ID = new Map(SIZE_PRESETS.map((s) => [s.id, s]));

function colorScheme(id: string): ColorScheme {
  return COLOR_BY_ID.get(id) ?? COLOR_BY_ID.get(DEFAULT_VARIANT.colorId)!;
}
function fontPairing(id: string): FontPairing {
  return FONT_BY_ID.get(id) ?? FONT_BY_ID.get(DEFAULT_VARIANT.fontId)!;
}
function spacingPreset(id: string | undefined): SpacingPreset {
  return SPACING_BY_ID.get(id ?? DEFAULT_SPACING_ID) ?? SPACING_BY_ID.get(DEFAULT_SPACING_ID)!;
}
function sizePreset(id: string | undefined): SizePreset {
  return SIZE_BY_ID.get(id ?? DEFAULT_SIZE_ID) ?? SIZE_BY_ID.get(DEFAULT_SIZE_ID)!;
}

/**
 * Resolve a selection to concrete CSS values for themeCssVars(). Total: unknown
 * ids fall back to a sensible default.
 *
 * `colors` is the color list to resolve `colorId` against. It defaults to the
 * global COLOR_SCHEMES (résumé templates), but templates whose palette lives
 * outside that list — e.g. the invoice templates, which also reuse ids like
 * "teal" with a different hue — pass their own `variants.colors` so the accent
 * resolves correctly (and per-template id collisions can't cross-contaminate).
 */
export function resolveVariant(v: Variant, colors: ColorScheme[] = COLOR_SCHEMES): {
  accent: string;
  displayStack: string;
  bodyStack: string;
  sectionScale: number;
  fontScale: number;
} {
  const c = colors.find((x) => x.id === v.colorId) ?? colors[0] ?? colorScheme(v.colorId);
  const f = fontPairing(v.fontId);
  const s = spacingPreset(v.spacingId);
  const z = sizePreset(v.sizeId);
  return {
    accent: c.accent,
    displayStack: fontStack(f.display),
    bodyStack: fontStack(f.body),
    sectionScale: s.scale,
    fontScale: z.scale,
  };
}

/** The font ids a variant needs embedded in the PDF (display + body, deduped). */
export function resolveVariantFontIds(v: Variant): FontId[] {
  const f = fontPairing(v.fontId);
  return [...new Set<FontId>([f.display, f.body])];
}
