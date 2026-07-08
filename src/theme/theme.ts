/**
 * Design tokens for the resume, expressed in PostScript POINTS (pt).
 *
 * Why points? A PDF page is measured in pt (1pt = 1/72 inch) and so is CSS
 * (`pt` is a real CSS unit). Authoring every size, gap and margin in pt lets the
 * preview render the page at its TRUE physical size (612pt x 792pt = 816px x
 * 1056px at 96dpi); `doc.html()` then captures that same rendered HTML into the
 * vector PDF, so the screen design and the PDF share one source of truth. The
 * preview scales the whole sheet down only to fit it on screen.
 */
import type { CSSProperties } from "react";

export const theme = {
  page: {
    width: 612, // US Letter
    height: 792,
    marginX: 56,
    marginTop: 46,
    marginBottom: 46,
  },
  color: {
    ink: "#1b1b1f",
    muted: "#54565c",
    faint: "#83858c",
    accent: "#1f3a5f", // deep navy
    rule: "#dfe1e6",
  },
  font: {
    sans: "Inter",
    serif: "SourceSerif",
  },
  /** Font sizes in pt. */
  size: {
    name: 25,
    headline: 10.5,
    contact: 9,
    section: 9.5,
    role: 10.5,
    org: 9.5,
    date: 9,
    body: 9.5,
  },
  /** Absolute line height in pt for multi-line / wrapped text. */
  leading: {
    contact: 12.4,
    body: 12.4,
  },
  /** Vertical rhythm in pt. */
  space: {
    afterName: 5,
    afterHeadline: 7,
    afterContact: 9,
    sectionTop: 12,
    afterSectionHeading: 7,
    itemGap: 8,
    afterItemHeader: 2.5,
    afterOrg: 3.5,
    bulletGap: 3,
    skillRowGap: 4,
    /** Horizontal gap between a skill row's label column and its values. */
    skillGap: 6,
  },
  /** Width of the skill-row label column, in pt. */
  skillLabelWidth: 96,
  /** Hairline stroke width in pt. */
  ruleWidth: 0.75,
  /** Hanging indent for bullet bodies, in pt. */
  bulletIndent: 13,
  /**
   * Tracking (letter-spacing) in pt for the uppercase labels — a hair keeps them
   * crisp. Kept small on purpose: doc.html() renders letter-spacing as glyph
   * positioning, and heavy tracking can make text extractors read "S U M M A R Y"
   * and hurt phrase search.
   */
  tracking: {
    headline: 0.5,
    section: 0.4,
  },
} as const;

/** React style object that also permits `--custom` CSS variable keys. */
export type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

/**
 * Mix a #rrggbb hex toward white by `amount` (0..1); 0 = unchanged, 1 = white.
 * Used to derive --c-accent-soft (a light tint of the accent) for surfaces like
 * Atlas's sidebar. Returns a plain hex so the PDF's html2canvas layer can parse
 * it (unlike CSS color-mix()).
 */
function tintTowardWhite(hex: string, amount: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const chan = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount);
  };
  const to2 = (c: number) => c.toString(16).padStart(2, "0");
  return `#${to2(chan(16))}${to2(chan(8))}${to2(chan(0))}`;
}

/**
 * Flatten the theme into CSS custom properties (all in `pt`) so the stylesheet
 * reads the exact same numbers — and doc.html() captures that rendered CSS into
 * the PDF. Applied inline on the `.resume-page` root.
 */
export function themeCssVars(overrides?: {
  accent?: string;
  displayStack?: string;
  bodyStack?: string;
  sectionScale?: number;
}): StyleWithVars {
  const t = theme;
  const accent = overrides?.accent ?? t.color.accent;
  return {
    "--page-w": `${t.page.width}pt`,
    "--page-h": `${t.page.height}pt`,
    "--margin-x": `${t.page.marginX}pt`,
    "--margin-top": `${t.page.marginTop}pt`,
    "--margin-bottom": `${t.page.marginBottom}pt`,

    "--c-ink": t.color.ink,
    "--c-muted": t.color.muted,
    "--c-faint": t.color.faint,
    "--c-accent": accent,
    "--c-accent-soft": tintTowardWhite(accent, 0.92),
    "--c-rule": t.color.rule,

    "--f-sans": overrides?.bodyStack ?? `"${t.font.sans}", system-ui, sans-serif`,
    "--f-serif": overrides?.displayStack ?? `"${t.font.serif}", Georgia, serif`,

    "--s-name": `${t.size.name}pt`,
    "--s-headline": `${t.size.headline}pt`,
    "--s-contact": `${t.size.contact}pt`,
    "--s-section": `${t.size.section}pt`,
    "--s-role": `${t.size.role}pt`,
    "--s-org": `${t.size.org}pt`,
    "--s-date": `${t.size.date}pt`,
    "--s-body": `${t.size.body}pt`,

    "--lh-contact": `${t.leading.contact}pt`,
    "--lh-body": `${t.leading.body}pt`,

    "--sp-after-name": `${t.space.afterName}pt`,
    "--sp-after-headline": `${t.space.afterHeadline}pt`,
    "--sp-after-contact": `${t.space.afterContact}pt`,
    "--sp-section-top": `${t.space.sectionTop}pt`,
    "--sp-section-scale": String(overrides?.sectionScale ?? 1),
    "--sp-after-section-heading": `${t.space.afterSectionHeading}pt`,
    "--sp-item-gap": `${t.space.itemGap}pt`,
    "--sp-after-item-header": `${t.space.afterItemHeader}pt`,
    "--sp-after-org": `${t.space.afterOrg}pt`,
    "--sp-bullet-gap": `${t.space.bulletGap}pt`,
    "--sp-skill-row-gap": `${t.space.skillRowGap}pt`,
    "--sp-skill-gap": `${t.space.skillGap}pt`,
    "--skill-label-w": `${t.skillLabelWidth}pt`,

    "--rule-w": `${t.ruleWidth}pt`,
    "--bullet-indent": `${t.bulletIndent}pt`,
    "--tracking-headline": `${t.tracking.headline}pt`,
    "--tracking-section": `${t.tracking.section}pt`,
  };
}
