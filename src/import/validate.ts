import { newId } from "../forms/update";
import type { ImportNode, ImportSpec } from "./spec";

export interface ImportError {
  path: string;
  message: string;
}

const EMPTY_MSG = "Paste the JSON the AI gave you, starting with “{”.";
const BAD_MSG =
  "That doesn't look like valid JSON — paste the whole object the AI returned, starting with “{” and ending with “}”.";

export type ParseResult = { ok: true; json: unknown } | { ok: false; message: string };

/** Tolerate a wrapping code fence or surrounding prose (formatting only — the
 *  strict content checks in validateAgainstSpec are unaffected). */
export function parseImportJson(text: string): ParseResult {
  let s = text.trim();
  const fence = s.match(/^```[a-zA-Z]*\n?([\s\S]*?)```$/);
  if (fence) s = fence[1].trim();
  if (!s) return { ok: false, message: EMPTY_MSG };

  const attempt = (candidate: string): unknown | undefined => {
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  };

  let parsed = attempt(s);
  if (parsed === undefined) {
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last > first) parsed = attempt(s.slice(first, last + 1));
  }
  if (parsed === undefined) return { ok: false, message: BAD_MSG };
  return { ok: true, json: parsed };
}

export type ValidateResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: ImportError[] };

function typeName(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "a list";
  switch (typeof v) {
    case "string": return "text";
    case "number": return "a number";
    case "boolean": return "a true/false";
    case "object": return "an object";
    default: return typeof v;
  }
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

function checkObject(
  spec: ImportSpec,
  value: unknown,
  path: string,
  errors: ImportError[],
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push({ path: path || "(root)", message: `expected an object, got ${typeName(value)}` });
    return {};
  }
  const src = value as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    if (!(key in spec)) errors.push({ path: join(path, key), message: "unknown key — not in the schema" });
  }
  const out: Record<string, unknown> = {};
  for (const [key, node] of Object.entries(spec)) {
    const p = join(path, key);
    if (!(key in src)) {
      if (node.required !== false) errors.push({ path: p, message: "required, but missing" });
      continue;
    }
    out[key] = checkNode(node, src[key], p, errors);
  }
  return out;
}

function checkNode(node: ImportNode, value: unknown, path: string, errors: ImportError[]): unknown {
  switch (node.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push({ path, message: `expected text, got ${typeName(value)}` });
        return "";
      }
      return value;
    case "strings":
      if (!Array.isArray(value)) {
        errors.push({ path, message: `expected a list of text, got ${typeName(value)}` });
        return [];
      }
      value.forEach((el, i) => {
        if (typeof el !== "string") errors.push({ path: `${path}[${i}]`, message: `expected text, got ${typeName(el)}` });
      });
      return value.filter((el) => typeof el === "string");
    case "object":
      return checkObject(node.fields, value, path, errors);
    case "list":
      if (!Array.isArray(value)) {
        errors.push({ path, message: `expected a list, got ${typeName(value)}` });
        return [];
      }
      return value.map((el, i) => checkObject(node.item, el, `${path}[${i}]`, errors));
  }
}

export function validateAgainstSpec(spec: ImportSpec, json: unknown): ValidateResult {
  const errors: ImportError[] = [];
  const value = checkObject(spec, json, "", errors);
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Inject a fresh id into every list element so items match the template types. */
export function finalizeImport(spec: ImportSpec, value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...value };
  for (const [key, node] of Object.entries(spec)) {
    if (!(key in out)) continue;
    if (node.type === "list") {
      const arr = (out[key] as Record<string, unknown>[]) ?? [];
      out[key] = arr.map((item) => ({ id: newId(), ...finalizeImport(node.item, item) }));
    } else if (node.type === "object") {
      out[key] = finalizeImport(node.fields, out[key] as Record<string, unknown>);
    }
  }
  return out;
}

const SUMMARY_LABELS: Record<string, [string, string]> = {
  experience: ["role", "roles"],
  education: ["school", "schools"],
  skills: ["skill group", "skill groups"],
};

/** Human counts for the "looks good" banner, e.g. "3 roles · 1 school · 3 skill groups". */
export function summarize(spec: ImportSpec, value: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, node] of Object.entries(spec)) {
    if (node.type !== "list") continue;
    const n = Array.isArray(value[key]) ? (value[key] as unknown[]).length : 0;
    const [one, many] = SUMMARY_LABELS[key] ?? [key, key];
    parts.push(`${n} ${n === 1 ? one : many}`);
  }
  return parts.join(" · ");
}
