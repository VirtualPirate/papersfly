# AI JSON Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user paste AI-generated JSON (produced from their existing resume) into the editor via a guided modal, strictly validate it, and replace the document content.

**Architecture:** A hand-authored `importSpec` per document type is the single contract. Both a copyable prompt (`buildImportPrompt`) and a strict validator (`validateAgainstSpec`) read from it, so they cannot drift. A 2-step radix Dialog copies the prompt, then parses/validates a pasted blob and hands a fresh immutable object to `App`'s existing `setData`.

**Tech Stack:** Astro + React (client-only island), TypeScript, `radix-ui` (Dialog), lucide-react icons, Tailwind + shadcn-style components, Vitest + @testing-library/react.

## Global Constraints

- **Package manager: pnpm.** Run tests with `pnpm exec vitest run <file>`.
- **No new dependencies.** `radix-ui` and `lucide-react` are already installed; use them. Do **not** add zod or a toast library. Do **not** change the vite/vitest versions (toolchain is on vite@8).
- **Client-only.** No backend, no network calls; the app supplies a prompt and ingests JSON only.
- **Path alias `@/` → `src/`.** Both `@/…` and relative imports are used in this repo; match the file you're editing.
- **`id` fields are internal.** The AI never produces them; import injects them via `newId()` from `src/forms/update.ts`.
- **Commits: the user handles all git commits.** Do **not** run `git add`/`git commit`. Each task ends at a green test state — stop there for review.
- Alerts render their icon as the first child, then `<AlertTitle>`/`<AlertDescription>` (see `src/App.tsx`). Match that shape.

---

### Task 1: `ImportSpec` type, helpers, and utilities

**Files:**
- Create: `src/import/spec.ts`
- Test: `src/import/spec.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ImportNode` (union: `{type:"string"|"strings"}` / `{type:"object";fields:ImportSpec}` / `{type:"list";item:ImportSpec}`, each with optional `required?: boolean`).
  - `type ImportSpec = Record<string, ImportNode>`.
  - `str(o?)`, `strings(o?)`, `obj(fields,o?)`, `list(item,o?)` → `ImportNode`.
  - `stripIds<T>(value: T): T` — recursively drops every `id` key.
  - `isDirty(current: unknown, sample: unknown): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/import/spec.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { str, strings, obj, list, stripIds, isDirty, type ImportSpec } from "./spec";

describe("import spec helpers", () => {
  it("builds nodes with the right type and required default", () => {
    expect(str()).toEqual({ type: "string" });
    expect(strings({ required: false })).toEqual({ type: "strings", required: false });
    const spec: ImportSpec = { c: obj({ a: str() }), xs: list({ b: strings() }) };
    expect(spec.c).toEqual({ type: "object", fields: { a: { type: "string" } } });
    expect(spec.xs).toEqual({ type: "list", item: { b: { type: "strings" } } });
  });

  it("stripIds removes id keys at every depth", () => {
    const input = { id: "x", name: "A", items: [{ id: "1", label: "L" }], nested: { id: "n", ok: true } };
    expect(stripIds(input)).toEqual({ name: "A", items: [{ label: "L" }], nested: { ok: true } });
  });

  it("isDirty compares by value", () => {
    const a = { name: "A", xs: [1, 2] };
    expect(isDirty(a, { name: "A", xs: [1, 2] })).toBe(false);
    expect(isDirty(a, { name: "B", xs: [1, 2] })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/import/spec.test.ts`
Expected: FAIL — `Failed to resolve import "./spec"` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/import/spec.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/import/spec.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Checkpoint** — tests green; stop for review (do not commit).

---

### Task 2: resume `importSpec` + `DocumentType` field

**Files:**
- Create: `src/documents/resume/importSpec.ts`
- Modify: `src/documents/types.ts` (add `importSpec` field)
- Modify: `src/documents/resume/index.ts` (attach `importSpec`)
- Test: `src/documents/resume/importSpec.test.ts`

**Interfaces:**
- Consumes: `ImportSpec`, `str/strings/obj/list` from Task 1; `sampleResume`, `ResumeData` (existing).
- Produces: `resumeImportSpec: ImportSpec`; `DocumentType<T>.importSpec: ImportSpec`; `resumeDocument.importSpec`.

- [ ] **Step 1: Write the failing test**

Create `src/documents/resume/importSpec.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resumeImportSpec } from "./importSpec";
import { resumeDocument } from "./index";
import { sampleResume } from "../../data/resume";

const contentKeys = (o: object) => Object.keys(o).filter((k) => k !== "id").sort();

describe("resumeImportSpec", () => {
  it("mirrors the top-level content keys of ResumeData", () => {
    expect(Object.keys(resumeImportSpec).sort()).toEqual(contentKeys(sampleResume));
  });

  it("mirrors each list item's content keys", () => {
    const exp = resumeImportSpec.experience;
    if (exp.type !== "list") throw new Error("experience must be a list");
    expect(Object.keys(exp.item).sort()).toEqual(contentKeys(sampleResume.experience[0]));

    const sk = resumeImportSpec.skills;
    if (sk.type !== "list") throw new Error("skills must be a list");
    expect(Object.keys(sk.item).sort()).toEqual(contentKeys(sampleResume.skills[0]));
  });

  it("is attached to the resume document", () => {
    expect(resumeDocument.importSpec).toBe(resumeImportSpec);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/documents/resume/importSpec.test.ts`
Expected: FAIL — `Failed to resolve import "./importSpec"`.

- [ ] **Step 3a: Create the resume spec**

Create `src/documents/resume/importSpec.ts`:

```ts
import { type ImportSpec, str, strings, obj, list } from "../../import/spec";

/** The resume CONTENT contract (mirrors ResumeData minus `id`s). Everything is
 *  required-present; empty "" / [] are valid values. */
export const resumeImportSpec: ImportSpec = {
  name: str(),
  headline: str(),
  contact: obj({
    email: str(),
    phone: str(),
    location: str(),
    website: str(),
    linkedin: str(),
  }),
  summary: str(),
  experience: list({
    role: str(),
    company: str(),
    location: str(),
    start: str(),
    end: str(),
    bullets: strings(),
  }),
  education: list({
    institution: str(),
    degree: str(),
    location: str(),
    start: str(),
    end: str(),
    detail: str(),
  }),
  skills: list({ label: str(), items: strings() }),
};
```

- [ ] **Step 3b: Add the field to `DocumentType`**

Modify `src/documents/types.ts` — add the import and the field:

```ts
import type { Template } from "../templates/types";
import type { ImportSpec } from "../import/spec";

export interface DocumentType<T> {
  id: string;
  name: string;
  defaultData: T;
  /** Content contract the AI-import prompt + validator are generated from. */
  importSpec: ImportSpec;
  templates: Template[];
}
```

- [ ] **Step 3c: Attach it to the resume document**

Modify `src/documents/resume/index.ts` — add the import and the property:

```ts
import { resumeImportSpec } from "./importSpec";
// …existing imports…

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "resume",
  defaultData: sampleResume,
  importSpec: resumeImportSpec,
  templates: [classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate],
};
```

- [ ] **Step 4: Run the test + a type-check**

Run: `pnpm exec vitest run src/documents/resume/importSpec.test.ts`
Expected: PASS (3 tests).

Run: `pnpm exec tsc --noEmit` (or `pnpm build`)
Expected: 0 errors (confirms `DocumentType.importSpec` is satisfied everywhere — only `resumeDocument` exists).

- [ ] **Step 5: Checkpoint** — green; stop for review.

---

### Task 3: Strict validation, id injection, and summary

**Files:**
- Create: `src/import/validate.ts`
- Test: `src/import/validate.test.ts`

**Interfaces:**
- Consumes: `ImportSpec`, `ImportNode` from Task 1; `resumeImportSpec` + `sampleResume` + `stripIds` in tests; `newId` from `src/forms/update.ts`.
- Produces:
  - `interface ImportError { path: string; message: string }`.
  - `parseImportJson(text: string): { ok: true; json: unknown } | { ok: false; message: string }`.
  - `validateAgainstSpec(spec, json): { ok: true; value: Record<string,unknown> } | { ok: false; errors: ImportError[] }`.
  - `finalizeImport(spec, value): Record<string,unknown>` — injects `id` into every `list` element.
  - `summarize(spec, value): string`.

- [ ] **Step 1: Write the failing test**

Create `src/import/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseImportJson, validateAgainstSpec, finalizeImport, summarize } from "./validate";
import { resumeImportSpec } from "../documents/resume/importSpec";
import { sampleResume } from "../data/resume";
import { stripIds } from "./spec";

const validContent = () => stripIds(structuredClone(sampleResume)) as Record<string, unknown>;

describe("parseImportJson", () => {
  it("parses a bare object", () => {
    expect(parseImportJson('{"a":1}')).toEqual({ ok: true, json: { a: 1 } });
  });
  it("strips a ```json fence", () => {
    expect(parseImportJson('```json\n{"a":1}\n```')).toEqual({ ok: true, json: { a: 1 } });
  });
  it("trims prose around the object", () => {
    expect(parseImportJson('Sure! Here you go:\n{"a":1}\nHope that helps')).toEqual({ ok: true, json: { a: 1 } });
  });
  it("reports non-JSON", () => {
    const r = parseImportJson("not json at all");
    expect(r.ok).toBe(false);
  });
});

describe("validateAgainstSpec (strict)", () => {
  it("accepts a full valid resume", () => {
    const r = validateAgainstSpec(resumeImportSpec, validContent());
    expect(r.ok).toBe(true);
  });
  it("errors on a missing required key", () => {
    const v = validContent(); delete v.contact;
    const r = validateAgainstSpec(resumeImportSpec, v);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.errors).toContainEqual({ path: "contact", message: "required, but missing" });
  });
  it("errors on a wrong type at an indexed path", () => {
    const v = validContent();
    (v.experience as any)[0].bullets = "just one line";
    const r = validateAgainstSpec(resumeImportSpec, v);
    if (!r.ok) expect(r.errors.some((e) => e.path === "experience[0].bullets")).toBe(true);
    else throw new Error("should have failed");
  });
  it("errors on an unknown key", () => {
    const v = validContent(); (v as any).objective = "x";
    const r = validateAgainstSpec(resumeImportSpec, v);
    if (!r.ok) expect(r.errors).toContainEqual({ path: "objective", message: "unknown key — not in the schema" });
    else throw new Error("should have failed");
  });
  it("treats null as a type mismatch, not present-and-empty", () => {
    const v = validContent(); (v as any).contact = null;
    const r = validateAgainstSpec(resumeImportSpec, v);
    expect(r.ok).toBe(false);
  });
});

describe("finalizeImport + summarize", () => {
  it("injects a unique id into every list item", () => {
    const v = validContent();
    const out = finalizeImport(resumeImportSpec, v) as any;
    const ids = [...out.experience, ...out.education, ...out.skills].map((i: any) => i.id);
    expect(ids.every((id: unknown) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("summarizes list counts", () => {
    expect(summarize(resumeImportSpec, validContent())).toBe("3 roles · 1 school · 3 skill groups");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/import/validate.test.ts`
Expected: FAIL — `Failed to resolve import "./validate"`.

- [ ] **Step 3: Write the implementation**

Create `src/import/validate.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/import/validate.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Checkpoint** — green; stop for review.

---

### Task 4: Prompt generation

**Files:**
- Create: `src/import/buildPrompt.ts`
- Test: `src/import/buildPrompt.test.ts`

**Interfaces:**
- Consumes: `ImportSpec`, `ImportNode`, `stripIds` (Task 1); `DocumentType` (Task 2); `validateAgainstSpec` (Task 3) in the test.
- Produces: `buildImportPrompt(doc: DocumentType<unknown>): string`.

- [ ] **Step 1: Write the failing test**

Create `src/import/buildPrompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildImportPrompt } from "./buildPrompt";
import { validateAgainstSpec } from "./validate";
import { stripIds } from "./spec";
import { resumeDocument } from "../documents/resume/index";
import type { DocumentType } from "../documents/types";

describe("buildImportPrompt", () => {
  const doc = resumeDocument as unknown as DocumentType<unknown>;
  const prompt = buildImportPrompt(doc);

  it("lists the schema keys and the hard rules", () => {
    expect(prompt).toContain('"experience"');
    expect(prompt).toContain('"bullets"');
    expect(prompt).toContain('"contact"');
    expect(prompt.toLowerCase()).toContain("no markdown code fences");
    expect(prompt).toContain('Do not include any "id" fields');
  });

  it("embeds a filled example (ANTI-DRIFT: the example must itself validate)", () => {
    const example = stripIds(doc.defaultData);
    expect(prompt).toContain(JSON.stringify(example, null, 2));
    expect(validateAgainstSpec(doc.importSpec, example).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/import/buildPrompt.test.ts`
Expected: FAIL — `Failed to resolve import "./buildPrompt"`.

- [ ] **Step 3: Write the implementation**

Create `src/import/buildPrompt.ts`:

```ts
import type { DocumentType } from "../documents/types";
import type { ImportNode, ImportSpec } from "./spec";
import { stripIds } from "./spec";

function outlineNode(node: ImportNode): string {
  switch (node.type) {
    case "string": return "text";
    case "strings": return "[text, …]";
    case "object": return outline(node.fields);
    case "list": return `[ ${outline(node.item)} ]`;
  }
}

function outline(spec: ImportSpec): string {
  return `{ ${Object.entries(spec).map(([k, n]) => `"${k}": ${outlineNode(n)}`).join(", ")} }`;
}

/** The copyable prompt. The type outline and the validator share `importSpec`,
 *  and the example is a real instance of the document — so the prompt describes
 *  exactly what validateAgainstSpec accepts. */
export function buildImportPrompt(doc: DocumentType<unknown>): string {
  const noun = doc.name.toLowerCase();
  const example = JSON.stringify(stripIds(doc.defaultData), null, 2);
  return [
    `You are a ${noun} data extractor. I will attach my ${noun}. Read it and reply with a single JSON object and nothing else.`,
    "",
    "Rules:",
    "- Output ONLY the JSON. No explanations, no markdown code fences.",
    "- Use exactly the keys shown below. Do not add any keys that aren't listed.",
    '- If something is unknown, use "" for text and [] for lists. Never invent facts.',
    "- Every value is text (a string). Put years and dates in quotes.",
    '- Do not include any "id" fields.',
    "",
    "The JSON must match this exact shape (types shown):",
    outline(doc.importSpec),
    "",
    "Here is a filled example — copy its structure exactly:",
    example,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/import/buildPrompt.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Checkpoint** — green; stop for review.

---

### Task 5: Dialog primitive + `ImportDialog`

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/import/ImportDialog.tsx`
- Test: `src/import/ImportDialog.test.tsx`

**Interfaces:**
- Consumes: `buildImportPrompt` (Task 4); `parseImportJson`, `validateAgainstSpec`, `finalizeImport`, `summarize`, `ImportError` (Task 3); `isDirty` (Task 1); `DocumentType` (Task 2); existing `Button`, `Textarea`, `Alert`, `cn`.
- Produces: `dialog.tsx` exports (`Dialog`, `DialogContent` with `container?` + `showClose?`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogTrigger`, `DialogClose`); `ImportDialog<T>` component with props `{ open, onOpenChange, doc, currentData, container?, onImport(next: T, summary: string) }`.

- [ ] **Step 1: Write the failing test**

Create `src/import/ImportDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImportDialog } from "./ImportDialog";
import { resumeDocument } from "../documents/resume/index";
import { sampleResume } from "../data/resume";
import { stripIds } from "./spec";

const validJson = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ ...(stripIds(sampleResume) as object), ...over });

function open(props: Partial<React.ComponentProps<typeof ImportDialog>> = {}) {
  const onImport = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ImportDialog
      open
      onOpenChange={onOpenChange}
      doc={resumeDocument}
      currentData={sampleResume}
      onImport={onImport}
      {...props}
    />,
  );
  return { onImport, onOpenChange };
}

const goToPaste = () => fireEvent.click(screen.getByRole("button", { name: /next: paste json/i }));
const pasteBox = () => screen.getByRole("textbox", { name: /pasted json/i });

describe("ImportDialog", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("step 1 shows the prompt and a copy button", () => {
    open();
    expect(screen.getByRole("heading", { name: /import from ai/i })).toBeInTheDocument();
    const promptBox = screen.getByLabelText("Prompt") as HTMLTextAreaElement;
    expect(promptBox.value).toContain("data extractor");
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("shows a summary and enables Import for valid JSON", () => {
    open();
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: validJson() } });
    expect(screen.getByText(/3 roles · 1 school · 3 skill groups/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import & replace/i })).not.toBeDisabled();
  });

  it("shows path errors and disables Import for invalid JSON", () => {
    open();
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: '{"name":"A","objective":"x"}' } });
    expect(screen.getByText("contact")).toBeInTheDocument(); // a missing-key path
    expect(screen.getByText("objective")).toBeInTheDocument(); // unknown-key path
    expect(screen.getByRole("button", { name: /import & replace/i })).toBeDisabled();
  });

  it("imports immediately when data is unedited", () => {
    const { onImport } = open({ currentData: sampleResume });
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: validJson({ name: "Imported One" }) } });
    fireEvent.click(screen.getByRole("button", { name: /import & replace/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const [next, summary] = onImport.mock.calls[0];
    expect(next.name).toBe("Imported One");
    expect(typeof next.experience[0].id).toBe("string");
    expect(summary).toBe("3 roles · 1 school · 3 skill groups");
  });

  it("confirms before replacing edited data", () => {
    const { onImport } = open({ currentData: { ...sampleResume, name: "Edited" } });
    goToPaste();
    fireEvent.change(pasteBox(), { target: { value: validJson() } });
    fireEvent.click(screen.getByRole("button", { name: /import & replace/i }));
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText(/replace current/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^replace$/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});
```

> Note: validation runs synchronously on change (parse+validate is trivially cheap for resume-sized JSON), so tests need no fake timers.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/import/ImportDialog.test.tsx`
Expected: FAIL — `Failed to resolve import "./ImportDialog"` (and `@/components/ui/dialog`).

- [ ] **Step 3a: Create the dialog primitive**

Create `src/components/ui/dialog.tsx`:

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogContent({
  className,
  children,
  container,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Portal target. Pass the `.app` root so the chrome-scoped reset in
   *  globals.css reaches the dialog's buttons/inputs (mirrors PopoverContent). */
  container?: HTMLElement | null;
  showClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal container={container ?? undefined}>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-background p-5 shadow-lg outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute right-3.5 top-3.5 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex items-center justify-between gap-2", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-base font-bold tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
```

- [ ] **Step 3b: Create the import dialog**

Create `src/import/ImportDialog.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert, CircleCheck, Copy, Check } from "lucide-react";
import type { DocumentType } from "@/documents/types";
import { isDirty } from "./spec";
import { buildImportPrompt } from "./buildPrompt";
import {
  parseImportJson,
  validateAgainstSpec,
  finalizeImport,
  summarize,
  type ImportError,
} from "./validate";

interface ImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentType<T>;
  currentData: T;
  container?: HTMLElement | null;
  onImport: (next: T, summary: string) => void;
}

type Result =
  | { kind: "idle" }
  | { kind: "parseError"; message: string }
  | { kind: "invalid"; errors: ImportError[] }
  | { kind: "valid"; value: Record<string, unknown>; summary: string };

export function ImportDialog<T>({
  open,
  onOpenChange,
  doc,
  currentData,
  container,
  onImport,
}: ImportDialogProps<T>) {
  const [step, setStep] = useState<"prompt" | "paste">("prompt");
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const prompt = useMemo(() => buildImportPrompt(doc as DocumentType<unknown>), [doc]);

  // Reset to a clean step 1 whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      setStep("prompt");
      setRaw("");
      setCopied(false);
      setConfirming(false);
    }
  }, [open]);

  const result = useMemo<Result>(() => {
    if (!raw.trim()) return { kind: "idle" };
    const parsed = parseImportJson(raw);
    if (!parsed.ok) return { kind: "parseError", message: parsed.message };
    const validated = validateAgainstSpec(doc.importSpec, parsed.json);
    if (!validated.ok) return { kind: "invalid", errors: validated.errors };
    return { kind: "valid", value: validated.value, summary: summarize(doc.importSpec, validated.value) };
  }, [raw, doc]);

  const noun = doc.name.toLowerCase();

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false); // Fallback: the prompt is visible and selectable in the readonly box.
    }
  };

  const doImport = () => {
    if (result.kind !== "valid") return;
    onImport(finalizeImport(doc.importSpec, result.value) as T, result.summary);
  };

  const onImportClick = () => {
    if (result.kind !== "valid") return;
    if (isDirty(currentData, doc.defaultData)) {
      setConfirming(true);
      return;
    }
    doImport();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={container} className="max-w-xl">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Replace current {noun}?</DialogTitle>
              <DialogDescription>
                You’ve edited it. Importing replaces everything with the pasted content and can’t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Keep editing</Button>
              <Button onClick={doImport}>Replace</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Import from AI</DialogTitle>
              <DialogDescription>Turn an existing {noun} into editable content in two steps.</DialogDescription>
            </DialogHeader>

            <div className="flex gap-1.5" role="tablist" aria-label="Import steps">
              <StepPill n={1} label="Get prompt" active={step === "prompt"} />
              <StepPill n={2} label="Paste JSON" active={step === "paste"} />
            </div>

            {step === "prompt" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Open ChatGPT, Claude, or Gemini, attach your {noun} PDF, paste this prompt, then copy the JSON it
                  replies with.
                </p>
                <div className="relative">
                  <Textarea readOnly value={prompt} rows={8} aria-label="Prompt" className="font-mono text-xs" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-2 gap-1.5"
                    onClick={copyPrompt}
                  >
                    {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={() => setStep("paste")}>Next: paste JSON ›</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  autoFocus
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  rows={8}
                  placeholder="Paste the JSON the AI returned…"
                  aria-label="Pasted JSON"
                  className="font-mono text-xs"
                />

                {result.kind === "valid" && (
                  <Alert>
                    <CircleCheck />
                    <AlertTitle>Looks good</AlertTitle>
                    <AlertDescription>Found {result.summary}.</AlertDescription>
                  </Alert>
                )}
                {result.kind === "parseError" && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Can’t read that</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
                {result.kind === "invalid" && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>
                      {result.errors.length} problem{result.errors.length > 1 ? "s" : ""} — nothing imported yet
                    </AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 space-y-1">
                        {result.errors.slice(0, 12).map((e, i) => (
                          <li key={i}>
                            <code className="rounded bg-muted px-1">{e.path}</code> {e.message}
                          </li>
                        ))}
                        {result.errors.length > 12 && <li>…and {result.errors.length - 12} more</li>}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setStep("prompt")}>‹ Back</Button>
                  <Button onClick={onImportClick} disabled={result.kind !== "valid"}>Import &amp; replace</Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepPill({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div
      role="tab"
      aria-selected={active}
      className={
        "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold " +
        (active ? "bg-foreground text-background" : "bg-muted text-muted-foreground")
      }
    >
      {n} · {label}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/import/ImportDialog.test.tsx`
Expected: PASS (5 tests). If radix warns about a missing description/title, confirm both `DialogTitle` and `DialogDescription` render in each branch (they do).

- [ ] **Step 5: Checkpoint** — green; stop for review.

---

### Task 6: Wire into `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (append two tests)

**Interfaces:**
- Consumes: `ImportDialog` (Task 5); existing `appEl`, `data`, `setData`, `setFontOverrides`, `Alert`, `Button`.
- Produces: header `Import` button; `importOpen`/`notice` state; `handleImport`; success `Alert`.

- [ ] **Step 1: Write the failing tests**

Append to `src/App.test.tsx` (inside the existing `describe("App", …)`):

```tsx
  it("opens the import dialog from the header", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });
    fireEvent.click(screen.getByRole("button", { name: /^import$/i }));
    expect(await screen.findByRole("heading", { name: /import from ai/i })).toBeInTheDocument();
  });

  it("imports pasted JSON into the live preview and shows a success alert", async () => {
    render(<App docId="resume" templateId="classic" />);
    await screen.findByRole("heading", { name: "Jordan Avery Chen" });

    fireEvent.click(screen.getByRole("button", { name: /^import$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /next: paste json/i }));

    const json = JSON.stringify({
      name: "Imported Person",
      headline: "Imported Headline",
      contact: { email: "", phone: "", location: "", website: "", linkedin: "" },
      summary: "",
      experience: [],
      education: [],
      skills: [],
    });
    fireEvent.change(screen.getByRole("textbox", { name: /pasted json/i }), { target: { value: json } });
    fireEvent.click(screen.getByRole("button", { name: /import & replace/i }));

    expect(await screen.findByRole("heading", { name: "Imported Person" })).toBeInTheDocument();
    expect(screen.getByText(/imported/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL — no button named "Import" (`Unable to find role="button" and name /^import$/i`).

- [ ] **Step 3a: Update imports + icons in `src/App.tsx`**

Add `useEffect` to the React import, add the icons, and import `ImportDialog`:

```tsx
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
// …existing imports…
import { ChevronDown, CircleAlert, CircleCheck, TriangleAlert, Upload, X } from "lucide-react";
import { ImportDialog } from "./import/ImportDialog";
```

- [ ] **Step 3b: Add state + effect + handler**

Inside `App`, after the existing `error` state (`const [error, setError] = useState<string | null>(null);`):

```tsx
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-dismiss the import success banner.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const handleImport = (next: any, summary: string) => {
    setData(next);
    setFontOverrides({}); // overrides key off replaced item ids; variant is preserved
    setImportOpen(false);
    setNotice(summary);
  };
```

- [ ] **Step 3c: Add the header button**

In the header actions, insert the `Import` button immediately before the "Reset sample" button:

```tsx
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" aria-hidden />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={handleReset}>
            Reset sample
          </Button>
```

- [ ] **Step 3d: Add the success alert**

Immediately after the existing `{error && ( … )}` alert block, add:

```tsx
      {notice && (
        <Alert className="shrink-0 rounded-none border-x-0 border-t-0">
          <CircleCheck />
          <AlertTitle>Imported</AlertTitle>
          <AlertDescription>Loaded {notice}.</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </Alert>
      )}
```

- [ ] **Step 3e: Render the dialog**

Just before the closing `</div>` of `.app` (after the `{capture && ( … )}` block), add:

```tsx
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        doc={doc}
        currentData={data}
        container={appEl}
        onImport={handleImport}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS (existing tests + the 2 new ones). The existing "surfaces a dismissable error alert" test still finds the PDF-error alert (no import notice is set in that test).

- [ ] **Step 5: Checkpoint** — green; stop for review.

---

### Task 7: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole suite**

Run: `pnpm test`
Expected: all files pass (spec, importSpec, validate, buildPrompt, ImportDialog, App, plus the pre-existing suite).

- [ ] **Step 2: Type-check + build**

Run: `pnpm build`
Expected: `astro check` reports 0 errors and the static build completes.

- [ ] **Step 3: Manual browser verification** (source of truth per CLAUDE.md)

Run: `pnpm build && pnpm preview`, open the editor, and:
1. Click **Import** → the modal opens on Step 1; **Copy** copies the prompt.
2. On Step 2, paste a malformed blob → path errors appear, **Import** stays disabled.
3. Paste a valid blob (e.g. the prompt's own example with an edited name) → green summary, **Import** enabled. Since the sample is unedited on a fresh load, it imports immediately; the preview repopulates and the success banner shows.
4. Edit a field, reopen, import again → the "Replace current resume?" confirm appears first.
5. Download the PDF and confirm it is still VECTOR: `node scripts/inspect-pdf.mjs resume.pdf`.

- [ ] **Step 4: Checkpoint** — feature complete; stop for review.

---

## Self-Review

**Spec coverage:**
- Surface (header button → modal) → Task 6 (button) + Task 5 (modal). ✓
- Apply model (validate → summary → replace, confirm-on-dirty) → Task 5 (`onImportClick`/`confirming`/`summarize`). ✓
- Strict validation, path errors, unknown-key rejection → Task 3. ✓
- Contract = hand-authored `importSpec`, single source for prompt + validator → Tasks 1, 2, 4. ✓
- Anti-drift invariant test → Task 4 Step 1. ✓
- `stripIds` example / `finalizeImport` id injection → Tasks 1, 3. ✓
- Clear font overrides on import, preserve variant → Task 6 (`handleImport`). ✓
- Dialog primitive on radix with `container` portal → Task 5. ✓
- Success via reused `Alert` (no toast) → Task 6. ✓
- Testing (validate, buildPrompt, ImportDialog, App) → Tasks 3–6. ✓

**Placeholder scan:** no TBD/TODO; every code step shows full code. ✓

**Type consistency:** `ImportSpec`/`ImportNode`, `ImportError`, `ParseResult`/`ValidateResult`, `parseImportJson`/`validateAgainstSpec`/`finalizeImport`/`summarize`, `buildImportPrompt`, and `ImportDialog` props (`onImport(next, summary)`) are used identically across tasks. `stripIds`/`isDirty` names match. ✓

## Notes / deliberate simplifications

- Validation runs **synchronously** on each change (not the ~200ms debounce the spec floated) — parse+validate is trivially cheap for resume-sized JSON and keeps the dialog test free of fake timers. No behavior change for the user.
- Extra keys are rejected at **every** depth (top level and inside objects/list items), consistent with "strict".
