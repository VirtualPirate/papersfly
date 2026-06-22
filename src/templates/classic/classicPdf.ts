import type { jsPDF } from "jspdf";
import type { ResumeData } from "../../data/resume";
import { theme, contentWidth } from "../../theme/theme";

/*
 * Vector PDF writer for the "Classic" template.
 *
 * This walks the same content top-to-bottom that ClassicPreview renders, but
 * emits jsPDF draw calls (text / lines / filled circles) instead of DOM nodes.
 * Both renderers read the SAME pt-based tokens from theme.ts, so the page they
 * produce matches. Every glyph here is real embedded-font text — selectable,
 * searchable, and crisp at any zoom — never a rasterized image.
 */

const M = theme.page.marginX;
const RIGHT = theme.page.width - theme.page.marginX;
const BOTTOM = theme.page.height - theme.page.marginBottom;

// Line-box heights (pt). Most blocks inherit the body line box in CSS; the name
// and contact lines have their own, mirrored here.
const LH = theme.leading.body;
const NAME_LH = theme.size.name * 1.02;
const CONTACT_LH = theme.leading.contact;

type Style = "normal" | "semibold" | "bold";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function classicToPdf(doc: jsPDF, data: ResumeData): void {
  let y = theme.page.marginTop;

  const setFont = (family: string, style: Style, size: number, color: string) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
    const [r, g, b] = hexToRgb(color);
    doc.setTextColor(r, g, b);
  };

  /** Add a page and reset the cursor if `need` pt won't fit below `y`. */
  const ensure = (need: number) => {
    if (y + need > BOTTOM) {
      doc.addPage();
      y = theme.page.marginTop;
    }
  };

  const textTop = (str: string, x: number, opts: { align?: "left" | "right" } = {}) => {
    // No charSpace on purpose: jsPDF renders tracking as per-glyph positioning,
    // which extractors read as inter-letter spaces. Keeping it off means every
    // line stays selectable AND searchable as whole words.
    doc.text(str, x, y, { baseline: "top", align: opts.align });
  };

  const rule = (color: string) => {
    const [r, g, b] = hexToRgb(color);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(theme.ruleWidth);
    doc.line(M, y, RIGHT, y);
    y += theme.ruleWidth;
  };

  /** Wrap a string to the content width using the CURRENT font metrics. */
  const wrap = (str: string, width: number): string[] => doc.splitTextToSize(str, width);

  /** Draw wrapped paragraph text, advancing LH per line, with page breaks. */
  const paragraph = (str: string, x: number, width: number) => {
    for (const line of wrap(str, width)) {
      ensure(LH);
      textTop(line, x);
      y += LH;
    }
  };

  // ---- Header ----------------------------------------------------------
  setFont(theme.font.serif, "bold", theme.size.name, theme.color.ink);
  textTop(data.name, M);
  y += NAME_LH;

  if (data.headline.trim()) {
    y += theme.space.afterName;
    setFont(theme.font.sans, "semibold", theme.size.headline, theme.color.accent);
    textTop(data.headline.toUpperCase(), M);
    y += LH;
  }

  const contactParts = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.website,
    data.contact.linkedin,
  ].filter((s) => s.trim());

  if (contactParts.length) {
    y += theme.space.afterHeadline;
    setFont(theme.font.sans, "normal", theme.size.contact, theme.color.muted);
    for (const line of wrap(contactParts.join("  ·  "), contentWidth)) {
      textTop(line, M);
      y += CONTACT_LH;
    }
  }

  y += theme.space.afterContact;
  rule(theme.color.rule);

  // ---- Section scaffolding --------------------------------------------
  const sectionHeading = (title: string) => {
    y += theme.space.sectionTop;
    // Reserve the heading scaffold PLUS the first item's minimum height (a
    // title line + an org line) so a heading never strands at the page bottom
    // with its content pushed to the next page.
    ensure(LH + 4 + theme.ruleWidth + theme.space.afterSectionHeading + LH * 2);
    setFont(theme.font.sans, "semibold", theme.size.section, theme.color.accent);
    textTop(title.toUpperCase(), M);
    y += LH + 4; // heading line box + CSS padding-bottom
    rule(theme.color.rule);
    y += theme.space.afterSectionHeading;
  };

  /**
   * A two-tone "Company · Location" line: company in accent, location muted.
   * Stays within the content width — wraps to a second line rather than
   * bleeding past the right margin (mirroring how the CSS block wraps).
   */
  const orgLine = (primary: string, location: string) => {
    setFont(theme.font.sans, "normal", theme.size.org, theme.color.accent);
    if (!location.trim()) {
      wrap(primary, contentWidth).forEach((line) => {
        ensure(LH);
        textTop(line, M);
        y += LH;
      });
      return;
    }
    const sep = " · ";
    if (doc.getTextWidth(primary + sep + location) <= contentWidth) {
      ensure(LH);
      textTop(primary, M);
      const w = doc.getTextWidth(primary);
      setFont(theme.font.sans, "normal", theme.size.org, theme.color.muted);
      textTop(sep + location, M + w);
      y += LH;
    } else {
      wrap(primary, contentWidth).forEach((line) => {
        ensure(LH);
        textTop(line, M);
        y += LH;
      });
      setFont(theme.font.sans, "normal", theme.size.org, theme.color.muted);
      wrap(location, contentWidth).forEach((line) => {
        ensure(LH);
        textTop(line, M);
        y += LH;
      });
    }
  };

  /**
   * A title (left) + date range (right) header row. The date reserves its own
   * right-hand column and the title wraps within the remaining width, so a long
   * title never overlaps the date or overflows the margin (matching the CSS
   * flex row where the date is `flex: none` and the title shrinks/wraps).
   */
  const titleDateRow = (title: string, start: string, end: string) => {
    const dateStr = start && end ? `${start} – ${end}` : start || end;
    let titleWidth = contentWidth;
    ensure(LH);
    if (dateStr) {
      setFont(theme.font.sans, "normal", theme.size.date, theme.color.faint);
      const dateW = doc.getTextWidth(dateStr);
      textTop(dateStr, RIGHT, { align: "right" }); // on the first line only
      titleWidth = Math.max(60, contentWidth - dateW - 10);
    }
    setFont(theme.font.sans, "semibold", theme.size.role, theme.color.ink);
    const lines = wrap(title, titleWidth);
    if (lines.length === 0) lines.push("");
    lines.forEach((line, k) => {
      if (k > 0) ensure(LH);
      textTop(line, M);
      y += LH;
    });
  };

  // ---- Summary ---------------------------------------------------------
  if (data.summary.trim()) {
    sectionHeading("Summary");
    setFont(theme.font.sans, "normal", theme.size.body, theme.color.ink);
    paragraph(data.summary, M, contentWidth);
  }

  // ---- Experience ------------------------------------------------------
  if (data.experience.length) {
    sectionHeading("Experience");
    data.experience.forEach((item, i) => {
      if (i > 0) y += theme.space.itemGap;
      ensure(LH * 2);
      titleDateRow(item.role, item.start, item.end);
      y += theme.space.afterItemHeader;
      orgLine(item.company, item.location);

      const bullets = item.bullets.filter((b) => b.trim());
      if (bullets.length) {
        y += theme.space.afterOrg;
        bullets.forEach((b, j) => {
          if (j > 0) y += theme.space.bulletGap;
          setFont(theme.font.sans, "normal", theme.size.body, theme.color.ink);
          const lines = wrap(b, contentWidth - theme.bulletIndent);
          ensure(LH);
          // Bullet dot, vertically centered on the first line.
          const [ar, ag, ab] = hexToRgb(theme.color.accent);
          doc.setFillColor(ar, ag, ab);
          doc.circle(M + 3.2, y + LH / 2, 1.2, "F");
          lines.forEach((line, k) => {
            if (k > 0) ensure(LH);
            textTop(line, M + theme.bulletIndent);
            y += LH;
          });
        });
      }
    });
  }

  // ---- Education -------------------------------------------------------
  if (data.education.length) {
    sectionHeading("Education");
    data.education.forEach((item, i) => {
      if (i > 0) y += theme.space.itemGap;
      ensure(LH * 2);
      titleDateRow(item.institution, item.start, item.end);
      y += theme.space.afterItemHeader;
      orgLine(item.degree, item.location);
      if (item.detail.trim()) {
        y += theme.space.afterItemHeader;
        setFont(theme.font.sans, "normal", theme.size.body, theme.color.muted);
        paragraph(item.detail, M, contentWidth);
      }
    });
  }

  // ---- Skills ----------------------------------------------------------
  if (data.skills.length) {
    sectionHeading("Skills");
    const LABEL_W = theme.skillLabelWidth;
    const GAP = theme.space.skillGap;
    const valueX = M + LABEL_W + GAP;
    const valueW = contentWidth - LABEL_W - GAP;
    data.skills.forEach((g, i) => {
      if (i > 0) y += theme.space.skillRowGap;
      // Wrap values first so we can reserve the whole row height and page-break
      // the entire row atomically (the label + its values stay together).
      setFont(theme.font.sans, "normal", theme.size.body, theme.color.muted);
      const valueLines = wrap(g.items.map((s) => s.trim()).filter(Boolean).join(", "), valueW);
      const rowH = Math.max(LH, valueLines.length * LH);
      ensure(rowH);
      const firstTop = y; // captured AFTER ensure, so a page break can't desync

      setFont(theme.font.sans, "semibold", theme.size.body, theme.color.ink);
      textTop(g.label, M);

      setFont(theme.font.sans, "normal", theme.size.body, theme.color.muted);
      let vy = firstTop;
      valueLines.forEach((line) => {
        doc.text(line, valueX, vy, { baseline: "top" });
        vy += LH;
      });
      y = firstTop + rowH;
    });
  }
}
