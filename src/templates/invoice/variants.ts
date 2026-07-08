import type { ColorScheme } from "../../theme/variants";
import { FONT_PAIRINGS } from "../../theme/variants";
import type { TemplateVariants } from "../types";

const c = (id: string, name: string, accent: string): ColorScheme => ({ id, name, accent });

export const NORDIC_VARIANTS: TemplateVariants = {
  colors: [c("red", "Signal red", "#e5342a"), c("cobalt", "Cobalt", "#1b34d8"), c("ink", "Ink", "#0f1115")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "red", fontId: "modern" },
};

export const STERLING_VARIANTS: TemplateVariants = {
  colors: [c("green", "Bottle green", "#20463a"), c("burgundy", "Burgundy", "#7c2d3a"), c("navy", "Navy", "#1f3a5f")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "green", fontId: "editorial" },
};

export const PRISM_VARIANTS: TemplateVariants = {
  colors: [c("teal", "Teal", "#124e48"), c("plum", "Plum", "#3b2a4a"), c("rust", "Rust", "#7a3b1f")],
  fonts: FONT_PAIRINGS,
  default: { colorId: "teal", fontId: "modern" },
};

export const BUREAU_VARIANTS: TemplateVariants = {
  colors: [c("blue", "Corporate blue", "#1e52c8"), c("slate", "Slate", "#334155"), c("teal", "Teal", "#0f766e")],
  fonts: FONT_PAIRINGS,
  // Sans display + body keeps the corporate wordmark sans by default (matching the
  // demo); the display slot (--f-serif) still drives the wordmark when switched.
  default: { colorId: "blue", fontId: "modern" },
};
