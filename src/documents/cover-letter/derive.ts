/** Marks derived from the sender's name — never stored, always recomputed. */
const words = (name: string): string[] => name.trim().split(/\s+/).filter(Boolean);

/** "Jordan Avery Chen" → "JC"; single word → its initial; blank → "". */
export function monogram(name: string): string {
  const w = words(name);
  if (w.length === 0) return "";
  const first = w[0][0].toUpperCase();
  return w.length === 1 ? first : first + w[w.length - 1][0].toUpperCase();
}

/** "Jordan Avery Chen" → "C" (surname initial); blank → "". */
export function ghostInitial(name: string): string {
  const w = words(name);
  return w.length === 0 ? "" : w[w.length - 1][0].toUpperCase();
}
