# Schema-Driven Editor Form — Design Spec

**Date:** 2026-06-24
**Status:** Approved for planning
**Topic:** Replace the hand-written `EditorForm` with a generic, schema-driven form engine so new document types are defined by a schema and get an editor form for free.

---

## 1. Problem & Goal

Today the editor is a single hand-written React component, `src/components/EditorForm.tsx` (~300 lines), wired specifically to the `ResumeData` shape. Every field, section, side-by-side row, array add/remove handler, and string-array transform is coded by hand. Supporting a second document type (cover letter, invoice, bio, etc.) would mean writing another ~300-line form from scratch.

**Goal:** Make the editor form **auto-generated from a schema definition**. A document type is described once by a typed schema; the form renders itself from that schema. The resume becomes the first of many document types.

**Decisions locked during brainstorming:**

1. **Many document types** — the resume is just `documents[0]`; the engine is generic.
2. **Bespoke TypeScript schema** — no new dependencies (no Zod, no JSON Schema / RJSF). The schema is a small typed descriptor authored in TS.
3. **Form auto-generated; preview hand-authored** — the schema drives the *editor*. The PDF *preview/design* stays a hand-authored template per document type, exactly like the current `ClassicPreview`. The existing template registry concept is preserved.

---

## 2. Architecture

### 2.1 The `DocumentType` concept

We introduce one new concept that bundles the three things a document needs, mirroring the existing `Template` pattern in `src/templates/registry.ts`:

```ts
interface DocumentType<T> {
  id: string;
  name: string;
  schema: FormSchema<T>;   // drives the auto-generated editor   ← NEW
  defaultData: T;          // the "sample" / reset content
  templates: Template[];   // hand-authored previews (existing concept, unchanged)
}
```

- `schema` is consumed by the new generic form engine.
- `defaultData` replaces the current `sampleResume` import as the per-type seed/reset content.
- `templates` keeps the existing `Template` shape (`{ id, name, Preview }`), so a single document type can still offer multiple designs. The active preview is `templates[0]` for now.

Adding a new document type later = write a `FooData` interface + a `fooSchema` + a `FooPreview` component + append one registry entry. The editor form is generated automatically.

### 2.2 Data flow

```
schema ──▶ <SchemaForm> ──▶ edits T (immutable) ──▶ Template.Preview ──▶ PDF (doc.html)
           (NEW generic engine)                       (hand-authored, as today)
```

The form engine only edits an immutable `T`. The preview path (live preview + offscreen capture + `downloadResumePdf`) is unchanged — it still renders `T` through a `Preview` component.

### 2.3 New / changed files

| File | Change |
|------|--------|
| `src/forms/schema.ts` | **New.** Schema type definitions + builder helpers (`section`, `field`, `textarea`, `lines`, `group`, `row`, `list`). |
| `src/forms/SchemaForm.tsx` | **New.** The single generic renderer + immutable update helpers. Replaces hand-written `EditorForm`. |
| `src/forms/update.ts` | **New (optional split).** Pure immutable-update helpers (set leaf, group set, array add/update/remove) for easy unit testing. May live inside `SchemaForm.tsx` if small. |
| `src/documents/resume/schema.ts` | **New.** `resumeSchema: FormSchema<ResumeData>`. |
| `src/documents/registry.ts` | **New.** `documents: DocumentType[]` list + `defaultDocument`. |
| `src/components/EditorForm.tsx` | **Removed** (superseded by `SchemaForm`). |
| `src/App.tsx` | **Changed.** Holds active document type; renders `<SchemaForm>`; adds a minimal doc-type `<select>`. |
| `src/data/resume.ts` | **Unchanged.** `ResumeData` interfaces stay the source of truth for types; `sampleResume` becomes the resume's `defaultData`. |

---

## 3. The Schema Model

Five field kinds cover 100% of the current resume form (verified against every input in `EditorForm.tsx`), plus one layout primitive:

| Kind | Renders as | Covers in resume |
|------|------------|-------------------|
| `text` | `<input>` | name, headline, role, company, dates, contact fields… |
| `textarea` | `<textarea rows>` | summary |
| `stringList` | `<input>` **or** `<textarea>`, lossless split/join on a separator | bullets (separator `\n`), skill items (separator `,`) |
| `group` | nested object rendered inline | `contact` |
| `array` | add/remove cards over object items, each with `#index` + Remove | experience, education, skills |
| `row` *(layout, not a field)* | side-by-side `field-row` wrapper | email+phone, location+website, start+end |

### 3.1 Types (illustrative)

```ts
type FieldSpec =
  | { control: "text"; placeholder?: string }
  | { control: "textarea"; rows?: number }
  | { control: "stringList"; separator: string; multiline?: boolean; rows?: number };

// A leaf control bound to key K of the current scope object.
interface LeafField<T>  { type: "field"; key: keyof T & string; label: string; spec: FieldSpec; }
interface RowField<T>   { type: "row"; fields: LeafField<T>[]; }
interface GroupField<T> { type: "group"; key: keyof T & string; label?: string; children: NodeOfSub<T>; }
interface ArrayField<T> { type: "array"; key: keyof T & string; title: string; makeItem: () => ItemSeed; children: NodeOfItem<T>; }

type Node<T> = LeafField<T> | RowField<T> | GroupField<T> | ArrayField<T>;
interface Section<T> { title?: string; children: Node<T>[]; }
type FormSchema<T> = Section<T>[];
```

### 3.2 Builders (the authoring surface)

To hide generic verbosity and keep schemas readable, authoring uses small builder functions:

```ts
section(title, children)
field(key, label, spec?)          // default spec = text
textarea(key, label, { rows })
lines(key, label, { rows })       // stringList, separator "\n", multiline
tags(key, label, { separator })   // stringList, separator ",", single input
row(...fields)
group(key, children, { label? })
list(key, title, makeItem, itemChildren)
```

### 3.3 resume schema (target)

```ts
export const resumeSchema: FormSchema<ResumeData> = [
  section("Basics", [
    field("name", "Full name"),
    field("headline", "Headline"),
    group("contact", [
      row(field("email", "Email"), field("phone", "Phone")),
      row(field("location", "Location"), field("website", "Website")),
      field("linkedin", "LinkedIn"),
    ]),
  ]),
  section("Summary", [
    textarea("summary", "Professional summary", { rows: 4 }),
  ]),
  list("experience", "Experience", makeBlankExperience, [
    field("role", "Role"),
    row(field("company", "Company"), field("location", "Location")),
    row(field("start", "Start"), field("end", "End")),
    lines("bullets", "Bullets (one per line)", { rows: 4 }),
  ]),
  list("education", "Education", makeBlankEducation, [
    field("institution", "Institution"),
    field("degree", "Degree"),
    row(field("start", "Start"), field("end", "End")),
    field("location", "Location"),
    field("detail", "Detail"),
  ]),
  list("skills", "Skills", makeBlankSkill, [
    field("label", "Category"),
    tags("items", "Items (comma-separated)"),
  ]),
];
```

This ~35-line schema replaces ~270 lines of repetitive JSX and is the same kind of artifact authored for every future document type.

---

## 4. The `SchemaForm` Renderer

A single component walks the schema and renders the **exact same CSS class names** the current form uses: `editor-form`, `form-section`, `field`, `field-label`, `field-row`, `card`, `card-head`, `idx`, `btn-mini`, `btn-mini danger`. Because the markup and classes are identical, **the migrated resume form is pixel-identical to today's** — the UI change is a pure refactor.

### 4.1 Rendering rules

- A `Section` → `<section className="form-section">` with an `<h2>` for its title.
- An `array` section's `<h2>` carries the `+ Add` button (calls `makeItem()`, engine assigns a fresh id, appends). Each item renders in a `.card` with a `#index` badge and a `Remove` button.
- A `row` → `<div className="field-row">` wrapping its leaf fields.
- A `group` → renders its children inline against the nested sub-object scope (no extra wrapper unless a label is provided).
- A `LeafField` → the shared `Field` (label + nested control), with the control chosen by `spec.control`.

### 4.2 Immutable updates

The hand-written `patch` / `updateExp` / `addExp` / `removeExp` logic generalizes into **scope-bound `value` + `onChange` closures** constructed as the renderer descends:

- Leaf at root: `onChange(v) => parentOnChange({ ...obj, [key]: v })`.
- Inside a `group`: the group provides a child `obj`/`onChange` over `obj[key]`.
- Inside an `array`: each item provides a child `obj`/`onChange` that maps the array, replacing the item by `id`. Add appends `{ id: newId(), ...makeItem() }`; Remove filters by `id`.

The engine owns id generation, reusing the current strategy: `crypto.randomUUID?.() ?? "id-" + Math.random().toString(36).slice(2)`. Array item types are constrained to include `id: string`.

### 4.3 `stringList` losslessness

`stringList` preserves the current lossless behavior exactly: the field value is `arr.join(separator)` and edits are `e.target.value.split(separator)`. Split/join on the same separator is an exact inverse, so the field shows exactly what was typed (no caret jumps); trimming/empty filtering stays at render time in the template, not in the editor.

---

## 5. Registry & App Wiring

`src/documents/registry.ts`:

```ts
export const documents: DocumentType<any>[] = [resumeDocument];
export const defaultDocument = documents[0];
```

`App.tsx`:

- Holds the active `DocumentType` and its `data` in state (seeded from `defaultDocument.defaultData`).
- Editor column renders `<SchemaForm schema={doc.schema} data={data} onChange={setData} />`.
- Preview renders `doc.templates[0].Preview` (replacing the direct `defaultTemplate` import).
- **Reset** sets `data` back to `doc.defaultData`.
- A **minimal doc-type selector** (`<select>` in the topbar) switches the active document type; switching loads that type's `defaultData`, schema, and template. With one type today it's a single-option control, but it exercises the "many types" path end-to-end.

The PDF capture pipeline (offscreen frozen copy, `downloadResumePdf`, scaling `ResizeObserver`) is unchanged — it still renders `data` through `Preview`.

---

## 6. Scope

### In scope (MVP)

- The schema type definitions + builders (`src/forms/schema.ts`).
- The generic `SchemaForm` renderer + immutable update helpers.
- The 6 kinds in §3 (`text`, `textarea`, `stringList`, `group`, `array`, `row`).
- The resume fully migrated to `resumeSchema`; `EditorForm.tsx` removed.
- `documents/registry.ts` + `DocumentType`.
- A minimal doc-type `<select>` in the topbar.

**Acceptance bar:** after migration the resume editor looks and behaves **identically** to today — same fields, same layout, same add/remove, same live-preview and PDF output. This is the primary regression gate.

### Deliberately out of scope (YAGNI for now)

- **Field validation** (required / min / max / format). The current form has none.
- **Drag-reorder** of array items. Not present today.
- **Generic font-coverage walker.** `src/fonts/coverage.ts`'s `collectResumeText` is resume-shaped. It keeps working for the resume as-is. A second document type would need a generic "walk every string in the data" version — flagged here, not built now.
- **Runtime/user-defined schemas.** Schemas are authored by developers in TS at build time.

---

## 7. Testing

The engine is pure logic + presentation, so it is highly testable:

- **Unit — immutable updates:** set a root leaf; set a nested group leaf; add / update / remove an array item by id; confirm previous objects are not mutated.
- **Unit — `stringList`:** `join` then `split` round-trips arbitrary input losslessly for both `\n` and `,` separators.
- **Render parity:** rendering `resumeSchema` produces the same set of labelled fields, sections, rows, and cards as the current `EditorForm` (snapshot or structural assertions).
- **Behavior:** typing in a generated field updates `data` and the live preview; `+ Add` / `Remove` mutate the right array; Reset restores `defaultData`.

---

## 8. Risks & Notes

- **Type-safety approach:** the schema is **checked against the hand-written `ResumeData` interface** (keys must exist, value kinds must match) rather than *inferring* the data type from the schema. This avoids gnarly recursive generics while keeping authoring type-safe. The TS interfaces in `src/data/resume.ts` remain the source of truth for types.
- **Nested generics:** `group` and `array` introduce sub-scopes; builders carry the generic threading so schema authors don't have to. If the strict key↔kind constraints prove noisy, they can be relaxed to "key exists on T" without changing runtime behavior.
- **Single visual regression surface:** because `SchemaForm` reuses existing CSS classes verbatim, the risk is concentrated and easy to verify (compare against current form).
