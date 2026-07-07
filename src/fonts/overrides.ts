/**
 * Per-field font overrides — design metadata kept SEPARATE from ResumeData.
 *
 * A FieldPath identifies one editor control (e.g. "name", "contact.email",
 * "experience.exp-1.role"). FontOverrides maps those paths to a FontId. The
 * template resolves each element's path to an inline font-family; absence means
 * "use the template default".
 */
import type { CSSProperties } from "react";
import { getFont, fontStack, type FontId } from "./library";

export type FieldPath = string;
export type FontOverrides = Record<FieldPath, FontId>;

/** Build a stable dotted path from a parent prefix and a child key. */
export function joinPath(prefix: string, key: string): FieldPath {
  return prefix ? `${prefix}.${key}` : key;
}

/** Inline style for an element, or undefined so the template's own CSS wins. */
export function fontStyleFor(
  overrides: FontOverrides,
  path: FieldPath,
): CSSProperties | undefined {
  const id = overrides[path];
  return id ? { fontFamily: fontStack(id) } : undefined;
}

/**
 * Fonts the template always uses (so they are embedded even with no overrides):
 * the Classic design's body/headings (Inter) and name (Source Serif).
 */
export const BASELINE_FONT_IDS: FontId[] = ["inter", "sourceSerif"];

/** The unique, known fonts that must be embedded for a given override set. */
export function usedFontIds(
  overrides: FontOverrides,
  baseIds: FontId[] = BASELINE_FONT_IDS,
): FontId[] {
  const set = new Set<FontId>(baseIds);
  for (const id of Object.values(overrides)) {
    if (getFont(id)) set.add(id);
  }
  return [...set];
}

/** Immutably set (or, on null, clear) the override for a path. */
export function setFontOverride(
  overrides: FontOverrides,
  path: FieldPath,
  id: FontId | null,
): FontOverrides {
  const next = { ...overrides };
  if (id == null) delete next[path];
  else next[path] = id;
  return next;
}
