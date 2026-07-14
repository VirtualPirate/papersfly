# AI JSON Import — Design Spec

**Date:** 2026-07-08
**Status:** Approved (design + flow confirmed via interactive demo)

## Overview

Let a user fill the editor by pasting a JSON blob that an AI tool produced from
their existing resume. The intended path: the user opens ChatGPT / Claude /
Gemini, attaches their resume PDF, pastes a **prompt supplied by the editor**,
and copies back the JSON the model returns. The editor then validates that JSON
and replaces the current document content with it.

The whole feature is client-side — consistent with the app's no-backend design.
It never calls a model itself; it only *hands the user a prompt* and *ingests the
result*.

**Confirmed decisions:**

- **Surface:** an `Import` button in the header opens a **guided 2-step modal**
  (Step 1 copy the prompt · Step 2 paste the JSON). (Not an inline panel, not a
  first-run screen.)
- **Apply model:** validate → show a short **summary** of what was found → Import
  **replaces** the whole document. If the current content differs from the
  sample, a "Replace?" confirm is shown first.
- **Validation:** **strict**. Every expected key must be present, types must
  match, and unknown keys are rejected. Errors are listed **field-by-field with
  paths**; nothing is imported until the JSON is clean.
- **Contract source:** a **hand-authored `importSpec`** per document type. Both
  the prompt and the strict validator are generated from this one object, so they
  cannot drift apart.

## Architecture

```
src/import/
  spec.ts          ImportSpec type + helpers (str/strings/obj/list) + stripIds/isDirty
  buildPrompt.ts   buildImportPrompt(doc) -> copyable prompt string
  validate.ts      parseImportJson / validateAgainstSpec / finalizeImport / summarize
  ImportDialog.tsx the 2-step modal UI

src/components/ui/dialog.tsx     radix Dialog primitive (mirrors popover.tsx)
src/documents/types.ts           DocumentType<T> gains `importSpec: ImportSpec`
src/documents/resume/importSpec.ts   the resume's ImportSpec
src/documents/resume/index.ts    attach importSpec to resumeDocument
src/App.tsx                      header Import button + dialog + success Alert
```

Data flow: **importSpec** → (`buildImportPrompt`) → prompt the user pastes into an
AI → JSON the user pastes back → (`parseImportJson` → `validateAgainstSpec` →
`finalizeImport`) → a new immutable data object handed to `App`'s existing
`setData`. From there it flows through the unchanged live-preview / PDF path.

## The contract — `src/import/spec.ts`

A declarative descriptor of a document's **content shape**. It intentionally omits
`id` fields — those are an internal design concern, injected on import, never
authored by the AI.

```ts
export type ImportNode =
  | { type: "string"; required?: boolean }
  | { type: "strings"; required?: boolean }               // string[]
  | { type: "object"; required?: boolean; fields: ImportSpec }
  | { type: "list"; required?: boolean; item: ImportSpec }; // array of objects

export type ImportSpec = Record<string, ImportNode>;
```

`required` defaults to **true** (every key must be present). "Present" is
distinct from "non-empty": `""` is a valid `string` value and `[]` is a valid
`strings`/`list` value. Strict validation checks *presence + type*, never
non-emptiness — which is what lets the prompt tell the model to emit `""` / `[]`
for unknowns.

Authoring helpers keep specs terse:

```ts
export const str = (o?: { required?: boolean }): ImportNode => ({ type: "string", ...o });
export const strings = (o?: { required?: boolean }): ImportNode => ({ type: "strings", ...o });
export const obj = (fields: ImportSpec, o?: { required?: boolean }): ImportNode => ({ type: "object", fields, ...o });
export const list = (item: ImportSpec, o?: { required?: boolean }): ImportNode => ({ type: "list", item, ...o });
```

Two small utilities live here too, used by prompt + dialog:

- `stripIds(value)` — recursively removes every `id` key (used to turn
  `defaultData` into the prompt's example).
- `isDirty(current, sample)` — `JSON.stringify(current) !== JSON.stringify(sample)`;
  drives the replace-confirm. (Both objects share the same authored shape and key
  order, so stringify comparison is stable.)

## The resume spec — `src/documents/resume/importSpec.ts`

Mirrors `ResumeData` exactly (no `id`s). Everything is required-present:

```ts
export const resumeImportSpec: ImportSpec = {
  name: str(),
  headline: str(),
  contact: obj({
    email: str(), phone: str(), location: str(), website: str(), linkedin: str(),
  }),
  summary: str(),
  experience: list({
    role: str(), company: str(), location: str(), start: str(), end: str(),
    bullets: strings(),
  }),
  education: list({
    institution: str(), degree: str(), location: str(), start: str(), end: str(),
    detail: str(),
  }),
  skills: list({ label: str(), items: strings() }),
};
```

`DocumentType<T>` gains one field:

```ts
export interface DocumentType<T> {
  id: string;
  name: string;
  defaultData: T;
  importSpec: ImportSpec;   // ← new
  templates: Template[];
}
```

`resumeDocument` sets `importSpec: resumeImportSpec`. (The content shape is
document-level — shared by all of a document's templates — so the spec lives on
the document, not per template.)

## Prompt generation — `src/import/buildPrompt.ts`

`buildImportPrompt(doc: DocumentType<any>): string` composes:

1. **Role + task line** — "You are a resume data extractor. Read the attached
   document and reply with a single JSON object and nothing else."
2. **Hard rules** — output *only* JSON; no markdown code fences; no explanations;
   use exactly the listed keys and **no others**; unknown text → `""`, unknown
   lists → `[]`; **never invent facts**; every value is text (quote years/dates);
   **do not include `id` fields**.
3. **Type outline** — rendered from `importSpec`, showing the exact keys and their
   types, e.g. `"experience": [ { "role": text, …, "bullets": [text, …] } ]`.
4. **A filled example** — `JSON.stringify(stripIds(doc.defaultData), null, 2)`, so
   the model has a concrete, valid target to copy the structure from.

Because both the type outline and the validator read the same `importSpec`, and
the example is a real instance of the document, the prompt describes exactly what
the validator accepts.

## Validation — `src/import/validate.ts`

```ts
export interface ImportError { path: string; message: string; }

export type ParseResult =
  | { ok: true; json: unknown }
  | { ok: false; message: string };

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ImportError[] };
```

- **`parseImportJson(text): ParseResult`** — trims; strips a leading/trailing
  markdown fence (```` ```json … ``` ````) if present; strips any prose before the
  first `{` / after the last `}`; then `JSON.parse`. A genuine parse failure
  returns a friendly `message` ("That doesn't look like JSON — paste the whole
  object the AI gave you, starting with `{`."). Fence/prose stripping is a
  *formatting* tolerance only; it does not relax the strict *content* checks.
- **`validateAgainstSpec(spec, json): ValidateResult`** — strict recursive walk:
  - top value must be an object;
  - every required key present (else `{ path, "required, but missing" }`);
  - **no unknown keys** (else `{ path, 'unknown key — not in the schema' }`);
  - `string` → must be a string (else "expected text, got <type>");
  - `strings` → array of strings (else "expected a list of text, …");
  - `object` → recurse into `fields`;
  - `list` → array; recurse into each element against `item`, paths indexed
    (`experience[0].bullets`).
  - `null` counts as a type mismatch, never as "present-and-empty".
  - No coercion of any kind (strict). Returns the validated value on success.
- **`finalizeImport(spec, value): T`** — walks `list` nodes and assigns a fresh
  `newId()` (from `src/forms/update.ts`) to every array element, returning the
  shape the templates consume (`ExperienceItem[]` etc. with `id`s). Non-list data
  passes through untouched.
- **`summarize(spec, value): string`** — human counts for the green banner, e.g.
  `"3 roles · 1 school · 3 skill groups"`, derived from the `list` nodes.

## Dialog primitive — `src/components/ui/dialog.tsx`

A new shadcn-style wrapper over `radix-ui`'s `Dialog`, following the exact
conventions of `popover.tsx`:

- `import { Dialog as DialogPrimitive } from "radix-ui"`.
- Export `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`,
  `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`.
- `DialogContent` takes a `container?: HTMLElement | null` prop and portals into
  it (`<DialogPrimitive.Portal container={container ?? undefined}>`), **exactly
  like `PopoverContent`** — so the chrome-scoped reset in `globals.css` (which
  replaces Tailwind Preflight) reaches the dialog's buttons/inputs. Includes an
  overlay with the standard fade/zoom `data-[state]` classes and `z-50`.

## Import modal — `src/import/ImportDialog.tsx`

```ts
interface ImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentType<T>;
  currentData: T;
  container?: HTMLElement | null;               // forwarded to DialogContent
  onImport: (next: T, summary: string) => void; // App applies + shows notice
}
```

Internal state: `step: "prompt" | "paste"`, `raw: string` (textarea), `copied:
boolean`, `confirming: boolean`. A `result` is derived from `raw` (via a ~200ms
debounce) as one of: `idle` (empty), `parseError(message)`, `invalid(errors)`,
`valid(value, summary)`.

**Step 1 — Get prompt.** A stepper (`1 · Get prompt` active). Instruction line
("Open ChatGPT, Claude, or Gemini, attach your resume PDF, paste this prompt,
then copy the JSON it replies with."). A read-only preview of
`buildImportPrompt(doc)` and a **Copy** button → `navigator.clipboard.writeText`;
on success flip to "Copied ✓" for ~1.5s. **Fallback:** if the clipboard API is
missing or throws, select the preview's text and show "Select all and press
⌘/Ctrl-C." Footer: `Cancel` · `Next: paste JSON ›`.

**Step 2 — Paste & check.** Stepper advances. A monospace `Textarea` bound to
`raw`. Below it:

- `valid` → a success `Alert` (green): "Valid. Found <summary>." Import enabled.
- `invalid` → a destructive `Alert` listing each `ImportError` as
  `<code>{path}</code> {message}`. Import disabled.
- `parseError` → destructive `Alert` with the friendly parse message. Import
  disabled.
- `idle` → nothing; Import disabled.

Footer: `‹ Back` · `Import & replace` (disabled unless `valid`).

**Confirm-on-dirty.** Clicking Import when `isDirty(currentData, doc.defaultData)`
sets `confirming = true`, swapping the footer/body for an in-dialog confirm
("Replace current resume? You've edited it; importing replaces everything and
can't be undone." · `Keep editing` / `Replace`). Not dirty → import immediately.
Confirm `Replace` → `onImport(finalizeImport(doc.importSpec, value), summary)`.

**Reset on close.** When `open` goes false, reset `step`, `raw`, `copied`,
`confirming`, so reopening starts clean at Step 1.

## App wiring — `src/App.tsx`

- New state: `const [importOpen, setImportOpen] = useState(false)` and
  `const [notice, setNotice] = useState<string | null>(null)`.
- Header: an `Import` button (`variant="outline"`, an upload/`Sparkles` lucide
  icon + label) placed **between the Style popover and "Reset sample"**, setting
  `importOpen` true.
- Render `<ImportDialog open={importOpen} onOpenChange={setImportOpen} doc={doc}
  currentData={data} container={appEl} onImport={handleImport} />`.
- `handleImport(next, summary)`:
  ```ts
  setData(next);
  setFontOverrides({});                 // old overrides key off replaced item ids
  setImportOpen(false);
  setNotice(`Imported — ${summary}.`);
  ```
  **Why clear `fontOverrides`:** overrides are keyed by data path including
  list-item `id` (e.g. `experience.<id>.role`), and `finalizeImport` mints fresh
  `id`s, so any existing override would dangle. `variant` (color/font/spacing/size)
  is template-level, not data-keyed, so it is **preserved** across an import.
- Success feedback: a dismissible **success `Alert`** rendered alongside the
  existing error/unsupported `Alert`s (same rounded-none top-banner pattern, a
  check icon, an `X` dismiss button). Auto-clears after ~4s via a `setTimeout`
  effect keyed on `notice`. No toast primitive is introduced.

## Error handling summary

| Situation | Behavior |
|---|---|
| Not JSON at all | `parseError` Alert, Import disabled |
| Fenced / prose-wrapped JSON | Fence/prose stripped, then validated normally |
| Missing required key / wrong type / unknown key | `invalid` Alert, path-listed, Import disabled |
| Empty textarea | Neutral, Import disabled |
| Clipboard blocked | Select text + manual-copy hint |
| Valid import while unedited | Imports immediately (no confirm) |
| Valid import while edited | In-dialog "Replace?" confirm first |

## Testing (vitest)

- **`src/import/validate.test.ts`** — a valid resume passes and returns the value;
  a missing `contact` errors at path `contact`; `experience[0].bullets` as a
  string errors ("expected a list…") at that indexed path; an unknown top-level
  key errors; a fenced ```` ```json ```` blob parses; `null` is a type error;
  `finalizeImport` injects `id`s that are present and unique across items;
  `summarize` returns the expected counts.
- **`src/import/buildPrompt.test.ts`** — the prompt contains every required
  top-level key and the no-fences / no-`id` / invent-nothing rules; **the
  anti-drift invariant**: `parseImportJson` + `validateAgainstSpec` on the
  example embedded in the prompt returns `ok: true`. (Guarantees the prompt and
  validator agree for every document type.)
- **`src/import/ImportDialog.test.tsx`** — Step 1 renders the prompt and Copy;
  advancing to Step 2 and pasting valid JSON shows the summary and enables Import;
  pasting invalid JSON shows path errors and disables Import; Import on unedited
  data calls `onImport` once with id-injected data; Import on edited data shows
  the confirm, and `Replace` then calls `onImport`.
- **`src/App.test.tsx`** — clicking header `Import` opens the dialog; a full
  import updates the preview (`.resume-page` reflects the new name) and shows the
  success Alert.
- Full suite green + `pnpm build` (0 type errors) + browser verification
  (`pnpm build && pnpm preview`): paste a real AI JSON, confirm the live preview
  repopulates and the exported PDF stays VECTOR (per `scripts/inspect-pdf.mjs`).

## Non-goals

- **No in-app model call / no PDF parsing.** The app supplies a prompt and ingests
  JSON; the user runs their own AI. (No backend, per the project's design.)
- **No merge.** Import replaces the whole document (confirmed apply model).
- **No coercion / forgiving mode.** Validation is strict (confirmed).
- **No schema-derived contract.** The contract is the hand-authored `importSpec`
  (confirmed) — not derived from the form schema, not zod.
- **No new success-toast system.** Reuse the existing `Alert` banner.
- **No per-template import.** The spec is document-level; templates are unaffected.
- **No export-to-JSON** (round-trip out). Import only, for now.
