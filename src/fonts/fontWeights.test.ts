import { describe, it, expect } from "vitest";
import { FONT_LIBRARY } from "./library";
import { FONT_LOADERS } from "./fontData";

/**
 * Weight- and identity-fidelity guard for the embedded PDF fonts.
 *
 * Regression backstop for the "bold/semibold not showing" bug: several vendored
 * families had their 600/700 slots filled with the *regular* master. Root cause
 * was subsetting a VARIABLE font without instancing it to a static weight first
 * (`fonttools varLib.instancer wght=600`), so the file kept a `wght` axis
 * defaulting to 400 and rendered regular at every weight. `gen-fonts.mjs` only
 * base64s whatever bytes exist and `verify:pdf` only flags *fallback* fonts —
 * neither notices a wrong-but-embedded weight, so nothing caught it.
 *
 * This test reads the ACTUAL embedded bytes (the fontData base64 the PDF ships)
 * and asserts, per family + weight (see src/fonts/AGENTS.md for the rules):
 *   1. NO `fvar` table — a static instance, not an un-instanced variable font
 *      that would collapse to its default (400) master.
 *   2. OS/2 usWeightClass equals the weight declared in library.ts (400/600/700).
 *   3. The name-table family is the expected typeface — the right font is in the
 *      slot (a Lora file is not sitting where Inter should be).
 */

/** name-table family substring expected per FontId (guards typeface identity). */
const EXPECTED_TYPEFACE: Record<string, string> = {
  inter: "Inter",
  sourceSerif: "Source Serif",
  lora: "Lora",
  playfair: "Playfair Display",
  plexSans: "IBM Plex Sans",
  plexMono: "IBM Plex Mono",
};

/** Minimal sfnt reader: byte offset of a table by tag, or null. */
function tableOffset(buf: Buffer, tag: string): number | null {
  const numTables = buf.readUInt16BE(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString("latin1", rec, rec + 4) === tag) return buf.readUInt32BE(rec + 8);
  }
  return null;
}

const hasTable = (buf: Buffer, tag: string) => tableOffset(buf, tag) !== null;

/** OS/2 usWeightClass lives at offset 4 within the OS/2 table (uint16). */
function usWeightClass(buf: Buffer): number | null {
  const off = tableOffset(buf, "OS/2");
  return off === null ? null : buf.readUInt16BE(off + 4);
}

/** name-table nameID 1 (font family), preferring the Windows (UTF-16BE) record. */
function familyName(buf: Buffer): string | null {
  const off = tableOffset(buf, "name");
  if (off === null) return null;
  const count = buf.readUInt16BE(off + 2);
  const strBase = off + buf.readUInt16BE(off + 4);
  let fallback: string | null = null;
  for (let i = 0; i < count; i++) {
    const r = off + 6 + i * 12;
    const platformID = buf.readUInt16BE(r);
    const nameID = buf.readUInt16BE(r + 6);
    if (nameID !== 1) continue;
    const len = buf.readUInt16BE(r + 8);
    const o = strBase + buf.readUInt16BE(r + 10);
    if (platformID === 3 || platformID === 0) {
      let s = "";
      for (let k = 0; k < len; k += 2) s += String.fromCharCode(buf.readUInt16BE(o + k));
      if (platformID === 3) return s; // Windows record wins
      fallback ??= s;
    } else {
      fallback ??= buf.toString("latin1", o, o + len);
    }
  }
  return fallback;
}

describe("embedded font fidelity", () => {
  for (const family of FONT_LIBRARY) {
    describe(family.name, () => {
      for (const w of family.weights) {
        it(`${w.file} is a static ${w.weight}-weight ${EXPECTED_TYPEFACE[family.id]} face`, async () => {
          const data = await FONT_LOADERS[family.id]();
          const b64 = data[w.file];
          expect(b64, `${w.file} missing from fontData`).toBeTruthy();
          const buf = Buffer.from(b64, "base64");

          // 1. Static, not a variable font defaulting to its regular master.
          expect(hasTable(buf, "fvar"), `${w.file} is a variable font (has fvar) — instance it to a static weight`).toBe(false);

          // 2. Declared weight is the weight actually baked into the face.
          expect(usWeightClass(buf), `${w.file} OS/2 usWeightClass`).toBe(w.weight);

          // 3. The right typeface is in this slot.
          const fam = familyName(buf) ?? "";
          expect(
            fam.toLowerCase().includes(EXPECTED_TYPEFACE[family.id].toLowerCase()),
            `${w.file} family is "${fam}", expected to contain "${EXPECTED_TYPEFACE[family.id]}"`,
          ).toBe(true);
        });
      }
    });
  }
});
