/**
 * A declarative descriptor of a document's CONTENT shape (no `id` fields — those
 * are injected on import). Both the import prompt (buildPrompt.ts) and the strict
 * validator (validate.ts) are generated from this one object, so they can't drift.
 */
export type ImportNode =
  | { type: "string"; required?: boolean }
  | { type: "strings"; required?: boolean } // string[]
  | { type: "object"; required?: boolean; fields: ImportSpec }
  | { type: "list"; required?: boolean; item: ImportSpec }; // array of objects

export type ImportSpec = Record<string, ImportNode>;

export const str = (o?: { required?: boolean }): ImportNode => ({ type: "string", ...o });
export const strings = (o?: { required?: boolean }): ImportNode => ({ type: "strings", ...o });
export const obj = (fields: ImportSpec, o?: { required?: boolean }): ImportNode => ({ type: "object", fields, ...o });
export const list = (item: ImportSpec, o?: { required?: boolean }): ImportNode => ({ type: "list", item, ...o });

/** Recursively remove every `id` key (turns defaultData into a prompt example). */
export function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripIds(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "id") continue;
      out[k] = stripIds(v as unknown);
    }
    return out as T;
  }
  return value;
}

/** True when the current document differs from the sample (drives the replace-confirm). */
export function isDirty(current: unknown, sample: unknown): boolean {
  return JSON.stringify(current) !== JSON.stringify(sample);
}
