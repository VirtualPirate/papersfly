/**
 * Glyph coverage of the embedded subset fonts.
 *
 * The bundled TTFs are subset to Latin + typographic punctuation (see
 * scripts/gen-fonts notes and the `pyftsubset --unicodes` set). Characters
 * outside this set have no glyph and would render as nothing in the PDF — so we
 * detect them up front and warn the user instead of silently dropping text
 * (a non-Latin name vanishing from a résumé is the worst-case failure).
 *
 * Keep these ranges in sync with the `U=` unicode set used when subsetting.
 */
const SUPPORTED_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x20, 0x7e], // Basic Latin (printable ASCII)
  [0xa0, 0x24f], // Latin-1 Supplement + Latin Extended-A/B (accents)
  [0x2010, 0x2027], // hyphens, dashes, quotes, bullet, ellipsis
  [0x2122, 0x2122], // ™
  [0x2192, 0x2192], // →
  [0x2212, 0x2212], // minus
  [0x20ac, 0x20ac], // €
  [0x25cf, 0x25cf], // ●
];

const WHITESPACE = new Set(["\n", "\r", "\t"]);

function isSupported(codePoint: number): boolean {
  return SUPPORTED_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
}

/**
 * Return the unique characters in `text` that the embedded fonts cannot render.
 * Whitespace is always considered fine.
 */
export function unsupportedChars(text: string): string[] {
  const out = new Set<string>();
  for (const ch of text) {
    if (WHITESPACE.has(ch)) continue;
    const cp = ch.codePointAt(0);
    if (cp !== undefined && !isSupported(cp)) out.add(ch);
  }
  return [...out];
}

/** Flatten every user-entered string in a resume into one blob for scanning. */
export function collectResumeText(data: import("../data/resume").ResumeData): string {
  const parts: string[] = [data.name, data.headline, data.summary, ...Object.values(data.contact)];
  for (const e of data.experience) parts.push(e.role, e.company, e.location, ...e.bullets);
  for (const e of data.education) parts.push(e.institution, e.degree, e.location, e.detail);
  for (const s of data.skills) parts.push(s.label, ...s.items);
  return parts.join(" ");
}
