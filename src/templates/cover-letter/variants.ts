import type { ColorScheme, FontPairing } from "../../theme/variants";
import type { TemplateVariants } from "../types";

const c = (id: string, name: string, accent: string): ColorScheme => ({ id, name, accent });

/**
 * Cover-letter pairing catalog. Unlike resumes/invoices (shared FONT_PAIRINGS,
 * where three pairings share an Inter body), a LETTER'S BODY IS ITS CONTENT —
 * so every pairing maps to a distinct body face and switching pairings visibly
 * restyles the letter, not just the letterhead. Previews must resolve against
 * this list (resolveVariant 3rd arg); the PDF download embeds against
 * template.variants.fonts, so the same list flows to the exporter.
 */
export const CL_FONT_PAIRINGS: FontPairing[] = [
  { id: "classic", name: "Classic", display: "sourceSerif", body: "inter" },
  { id: "editorial", name: "Editorial", display: "playfair", body: "lora" },
  { id: "modern", name: "Modern", display: "plexSans", body: "plexSans" },
  { id: "mono", name: "Mono", display: "plexMono", body: "plexMono" },
];

export const CAMEO_VARIANTS: TemplateVariants = {
  colors: [c("burgundy", "Burgundy", "#722f37"), c("navy", "Navy", "#16324f"), c("charcoal", "Charcoal", "#2f2f33")],
  fonts: CL_FONT_PAIRINGS,
  default: { colorId: "burgundy", fontId: "editorial" },
};

export const STRATA_VARIANTS: TemplateVariants = {
  colors: [c("cobalt", "Cobalt", "#1e45c0"), c("ink", "Ink", "#0f1115"), c("vermilion", "Vermilion", "#c2402a")],
  fonts: CL_FONT_PAIRINGS,
  // Sans display + body keeps the wordmark sans by default (Bureau precedent);
  // the display slot (--f-serif) still drives the name when switched.
  default: { colorId: "cobalt", fontId: "modern" },
};

export const CARBON_VARIANTS: TemplateVariants = {
  colors: [c("red", "Stamp red", "#c2402a"), c("ink", "Ink", "#26231e"), c("blue", "Corporate blue", "#1e52c8")],
  fonts: CL_FONT_PAIRINGS,
  // Mono display drives the typewritten letterhead + routing block.
  default: { colorId: "red", fontId: "mono" },
};

export const MISSIVE_VARIANTS: TemplateVariants = {
  colors: [c("forest", "Forest", "#2e5d4b"), c("burgundy", "Burgundy", "#722f37"), c("slate", "Slate", "#334155")],
  fonts: CL_FONT_PAIRINGS,
  default: { colorId: "forest", fontId: "classic" },
};

export const FOUNDRY_VARIANTS: TemplateVariants = {
  colors: [c("navy", "Navy", "#16324f"), c("forest", "Forest", "#2e5d4b"), c("charcoal", "Charcoal", "#2f2f33")],
  fonts: CL_FONT_PAIRINGS,
  default: { colorId: "navy", fontId: "classic" },
};
