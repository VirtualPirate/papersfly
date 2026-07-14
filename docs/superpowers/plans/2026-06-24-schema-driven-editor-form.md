# Schema-Driven Editor Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written `EditorForm` with a generic, schema-driven form engine so each document type is described by a typed schema and gets its editor form auto-generated; migrate the resume to be the first such document type with no visual or behavioral change.

**Architecture:** A small bespoke TypeScript schema (authored via type-safe builder functions) describes a document's fields. One generic `SchemaForm` component walks that schema and renders the exact same markup/CSS the current form uses, generalizing the immutable-update logic. A `DocumentType` registry bundles `{ schema, defaultData, templates }` per type, mirroring the existing template registry. The PDF preview/capture pipeline is untouched.

**Tech Stack:** React 18 + TypeScript 5.6 (strict), Vite 5, jsPDF (existing). Vitest 2 + @testing-library/react (new devDependencies, test-only).

## Global Constraints

- **No new runtime dependencies.** Zod, JSON Schema, and react-jsonschema-form are explicitly forbidden. Only test tooling may be added, as `devDependencies`.
- **Strict TypeScript everywhere:** `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are on. Code must compile under `tsc --noEmit`.
- **Import style:** no file extensions in import specifiers (match existing repo style, e.g. `import { x } from "./data/resume"`).
- **Reuse existing CSS class names verbatim:** `editor-form`, `form-section`, `field`, `field-label`, `field-row`, `card`, `card-head`, `idx`, `btn-mini`, `btn-mini danger`. The migrated resume editor MUST look and behave identically to today — this is the primary acceptance gate.
- **ID strategy (reuse exactly):** `crypto.randomUUID?.() ?? \`id-${Math.random().toString(36).slice(2)}\``.
- **Components:** function components, named exports (match repo style).

**Pre-flight (do once before Task 1):** create a feature branch off `main`:
```bash
git checkout -b feat/schema-driven-form
```

---

### Task 1: Test infrastructure (Vitest + React Testing Library)

**Files:**
- Modify: `package.json` (add devDeps + scripts)
- Modify: `vite.config.ts` (add `test` block)
- Create: `src/test/setup.ts`
- Create: `src/test/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` command (Vitest, jsdom environment) with jest-dom matchers and a `ResizeObserver` stub available to all later tests.

- [ ] **Step 1: Install test devDependencies**

Run:
```bash
npm install -D vitest@^2.1.8 jsdom@^25.0.1 @testing-library/react@^16.1.0 @testing-library/dom@^10.4.0 @testing-library/jest-dom@^6.6.3
```
Expected: packages added under `devDependencies` in `package.json`; `package-lock.json` updated. (If a listed version is unavailable, install the latest compatible release — Vitest 2.x, RTL 16.x, jest-dom 6.x.)

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add Vitest config to `vite.config.ts`**

Add a triple-slash reference as the first line and a `test` block to the config object:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```
(Keep the existing explanatory comments in the file; only the reference line and `test` block are added.)

- [ ] **Step 4: Create the test setup file**

Create `src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver; App.tsx subscribes one on mount. Stub it so
// component tests that render <App/> don't throw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error jsdom global has no ResizeObserver type
globalThis.ResizeObserver = ResizeObserverStub;
```

- [ ] **Step 5: Write a sanity test**

Create `src/test/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs and has jest-dom matchers", () => {
    expect(1 + 1).toBe(2);
    expect(typeof globalThis.ResizeObserver).toBe("function");
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test`
Expected: PASS — 1 test file, 1 test passing.

- [ ] **Step 7: Verify the build still typechecks**

Run: `npm run build`
Expected: `tsc --noEmit` passes (test files included) and `vite build` succeeds.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/test/sanity.test.ts
git commit -m "test: add Vitest + Testing Library harness

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Immutable update helpers

**Files:**
- Create: `src/forms/update.ts`
- Test: `src/forms/update.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `newId(): string`
  - `setKey<O>(obj: O, key: keyof O, value: unknown): O`
  - `addItem<I extends { id: string }>(arr: I[], item: Omit<I, "id">): I[]`
  - `updateItem<I extends { id: string }>(arr: I[], id: string, next: I): I[]`
  - `removeItem<I extends { id: string }>(arr: I[], id: string): I[]`

- [ ] **Step 1: Write the failing tests**

Create `src/forms/update.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { newId, setKey, addItem, updateItem, removeItem } from "./update";

describe("newId", () => {
  it("returns a non-empty string", () => {
    expect(typeof newId()).toBe("string");
    expect(newId().length).toBeGreaterThan(0);
  });
  it("returns distinct values across calls", () => {
    expect(newId()).not.toBe(newId());
  });
});

describe("setKey", () => {
  it("sets a key immutably", () => {
    const o = { a: 1, b: 2 };
    const r = setKey(o, "a", 9);
    expect(r).toEqual({ a: 9, b: 2 });
    expect(o.a).toBe(1); // original untouched
  });
});

describe("array helpers", () => {
  const arr = [
    { id: "x", v: 1 },
    { id: "y", v: 2 },
  ];

  it("addItem appends with a fresh id and does not mutate", () => {
    const r = addItem(arr, { v: 3 });
    expect(r.length).toBe(3);
    expect(r[2].v).toBe(3);
    expect(typeof r[2].id).toBe("string");
    expect(r[2].id.length).toBeGreaterThan(0);
    expect(arr.length).toBe(2);
  });

  it("updateItem replaces the matching item by id", () => {
    const r = updateItem(arr, "y", { id: "y", v: 99 });
    expect(r).toEqual([
      { id: "x", v: 1 },
      { id: "y", v: 99 },
    ]);
    expect(arr[1].v).toBe(2);
  });

  it("removeItem filters out the matching id", () => {
    const r = removeItem(arr, "x");
    expect(r).toEqual([{ id: "y", v: 2 }]);
    expect(arr.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/forms/update.test.ts`
Expected: FAIL — "Failed to resolve import './update'" / module not found.

- [ ] **Step 3: Implement the helpers**

Create `src/forms/update.ts`:
```ts
/**
 * Pure, immutable update helpers shared by the schema-driven form engine.
 * Each returns a new value; inputs are never mutated.
 */

/** Reused verbatim from the original EditorForm id strategy. */
export const newId = (): string =>
  crypto.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;

/** Return a copy of `obj` with `key` set to `value`. */
export function setKey<O>(obj: O, key: keyof O, value: unknown): O {
  return { ...obj, [key]: value };
}

/** Append `item` (without an id) to `arr`, assigning a fresh id. */
export function addItem<I extends { id: string }>(arr: I[], item: Omit<I, "id">): I[] {
  return [...arr, { ...(item as object), id: newId() } as I];
}

/** Replace the element whose id matches with `next`. */
export function updateItem<I extends { id: string }>(arr: I[], id: string, next: I): I[] {
  return arr.map((it) => (it.id === id ? next : it));
}

/** Remove the element whose id matches. */
export function removeItem<I extends { id: string }>(arr: I[], id: string): I[] {
  return arr.filter((it) => it.id !== id);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/forms/update.test.ts`
Expected: PASS — all update helper tests green.

- [ ] **Step 5: Commit**

```bash
git add src/forms/update.ts src/forms/update.test.ts
git commit -m "feat: add immutable update helpers for form engine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Schema types and builders

**Files:**
- Create: `src/forms/schema.ts`
- Test: `src/forms/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (node model — stored shapes are non-generic; authoring safety lives in the builder):
  - `type FieldSpec = { control: "text"; placeholder?: string } | { control: "textarea"; rows?: number } | { control: "stringList"; separator: string; multiline: boolean; rows?: number }`
  - `interface LeafField { kind: "field"; key: string; label: string; spec: FieldSpec }`
  - `interface RowNode { kind: "row"; fields: LeafField[] }`
  - `interface GroupNode { kind: "group"; key: string; children: FieldNode[] }`
  - `type FieldNode = LeafField | RowNode | GroupNode`
  - `interface Section { kind: "section"; title: string; children: FieldNode[] }`
  - `interface ArrayNode { kind: "array"; key: string; title: string; makeItem: () => Record<string, unknown>; itemChildren: FieldNode[] }`
  - `type Block = Section | ArrayNode`
  - `type FormSchema<T> = Block[]` (T is a documentation phantom; key-correctness is enforced by the builder)
  - `interface Builder<S>` with `field/textarea/lines/tags/row/group`
  - `interface RootBuilder<T> extends Builder<T>` with `section/list`
  - `function builder<T>(): RootBuilder<T>`

- [ ] **Step 1: Write the failing tests**

Create `src/forms/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { builder } from "./schema";

interface Demo {
  name: string;
  tags: string[];
  contact: { email: string };
  items: { id: string; label: string }[];
}

describe("builder", () => {
  const b = builder<Demo>();

  it("field defaults to a text control", () => {
    expect(b.field("name", "Name")).toEqual({
      kind: "field",
      key: "name",
      label: "Name",
      spec: { control: "text" },
    });
  });

  it("tags produces a comma-separated stringList", () => {
    expect(b.tags("tags", "Tags").spec).toEqual({
      control: "stringList",
      separator: ",",
      multiline: false,
    });
  });

  it("lines produces a newline multiline stringList", () => {
    expect(b.lines("tags", "Tags", { rows: 4 }).spec).toEqual({
      control: "stringList",
      separator: "\n",
      multiline: true,
      rows: 4,
    });
  });

  it("group nests children built with the sub-scope builder", () => {
    const g = b.group("contact", (c) => [c.field("email", "Email")]);
    expect(g).toEqual({
      kind: "group",
      key: "contact",
      children: [{ kind: "field", key: "email", label: "Email", spec: { control: "text" } }],
    });
  });

  it("list captures key, title, makeItem and item children", () => {
    const node = b.list("items", "Items", () => ({ label: "" }), (it) => [
      it.field("label", "Label"),
    ]);
    expect(node.kind).toBe("array");
    expect(node.key).toBe("items");
    expect(node.title).toBe("Items");
    expect(node.itemChildren).toEqual([
      { kind: "field", key: "label", label: "Label", spec: { control: "text" } },
    ]);
    expect(node.makeItem()).toEqual({ label: "" });
  });

  it("section wraps field nodes", () => {
    const s = b.section("Basics", [b.field("name", "Name")]);
    expect(s.kind).toBe("section");
    expect(s.title).toBe("Basics");
    expect(s.children.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/forms/schema.test.ts`
Expected: FAIL — module `./schema` not found.

- [ ] **Step 3: Implement the schema types and builders**

Create `src/forms/schema.ts`:
```ts
/**
 * A bespoke, dependency-free schema describing a document's editor form.
 *
 * Stored node shapes are intentionally NON-generic (string keys + structural
 * data) so the renderer stays simple. Authoring type-safety — keys must exist
 * on the data type, group/list callbacks are scoped to the right sub-type —
 * lives entirely in `builder<T>()`. Write `builder<MyData>()` and the compiler
 * checks every key against `MyData`.
 */

export type FieldSpec =
  | { control: "text"; placeholder?: string }
  | { control: "textarea"; rows?: number }
  | { control: "stringList"; separator: string; multiline: boolean; rows?: number };

export interface LeafField {
  kind: "field";
  key: string;
  label: string;
  spec: FieldSpec;
}

export interface RowNode {
  kind: "row";
  fields: LeafField[];
}

export interface GroupNode {
  kind: "group";
  key: string;
  children: FieldNode[];
}

export type FieldNode = LeafField | RowNode | GroupNode;

export interface Section {
  kind: "section";
  title: string;
  children: FieldNode[];
}

export interface ArrayNode {
  kind: "array";
  key: string;
  title: string;
  makeItem: () => Record<string, unknown>;
  itemChildren: FieldNode[];
}

export type Block = Section | ArrayNode;

/** A document's form schema. `T` documents the data type the builder enforced. */
export type FormSchema<T> = Block[];

type Key<S> = Extract<keyof S, string>;
type ElementOf<A> = A extends readonly (infer E)[] ? E : never;

/** Builder for a given object scope `S`. Returned by `builder<T>()`. */
export interface Builder<S> {
  field(key: Key<S>, label: string, spec?: FieldSpec): LeafField;
  textarea(key: Key<S>, label: string, opts?: { rows?: number }): LeafField;
  /** string[] edited as a multiline textarea, one item per line. */
  lines(key: Key<S>, label: string, opts?: { rows?: number }): LeafField;
  /** string[] edited as a single input, separator-joined (default ","). */
  tags(key: Key<S>, label: string, opts?: { separator?: string }): LeafField;
  row(...fields: LeafField[]): RowNode;
  group<K extends Key<S>>(key: K, build: (b: Builder<S[K]>) => FieldNode[]): GroupNode;
}

/** Top-level builder: adds section/list which are only valid at the root. */
export interface RootBuilder<T> extends Builder<T> {
  section(title: string, children: FieldNode[]): Section;
  list<K extends Key<T>>(
    key: K,
    title: string,
    makeItem: () => Omit<ElementOf<T[K]>, "id">,
    build: (b: Builder<ElementOf<T[K]>>) => FieldNode[],
  ): ArrayNode;
}

/**
 * Construct a type-safe builder for data type `T`. The single internal `any`
 * keeps the implementation free of generic-variance noise; all external
 * call-site safety comes from the `RootBuilder<T>` signature.
 */
export function builder<T>(): RootBuilder<T> {
  const b: any = {
    field: (key: string, label: string, spec: FieldSpec = { control: "text" }) => ({
      kind: "field",
      key,
      label,
      spec,
    }),
    textarea: (key: string, label: string, opts?: { rows?: number }) => ({
      kind: "field",
      key,
      label,
      spec: { control: "textarea", rows: opts?.rows },
    }),
    lines: (key: string, label: string, opts?: { rows?: number }) => ({
      kind: "field",
      key,
      label,
      spec: { control: "stringList", separator: "\n", multiline: true, rows: opts?.rows },
    }),
    tags: (key: string, label: string, opts?: { separator?: string }) => ({
      kind: "field",
      key,
      label,
      spec: { control: "stringList", separator: opts?.separator ?? ",", multiline: false },
    }),
    row: (...fields: LeafField[]) => ({ kind: "row", fields }),
    group: (key: string, build: (sub: any) => FieldNode[]) => ({
      kind: "group",
      key,
      children: build(builder()),
    }),
    section: (title: string, children: FieldNode[]) => ({ kind: "section", title, children }),
    list: (
      key: string,
      title: string,
      makeItem: () => Record<string, unknown>,
      build: (sub: any) => FieldNode[],
    ) => ({ kind: "array", key, title, makeItem, itemChildren: build(builder()) }),
  };
  return b as RootBuilder<T>;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/forms/schema.test.ts`
Expected: PASS — all builder tests green.

- [ ] **Step 5: Commit**

```bash
git add src/forms/schema.ts src/forms/schema.test.ts
git commit -m "feat: add bespoke form schema types and type-safe builder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: The SchemaForm renderer

**Files:**
- Create: `src/forms/SchemaForm.tsx`
- Test: `src/forms/SchemaForm.test.tsx`

**Interfaces:**
- Consumes: `FormSchema`, `Block`, `FieldNode`, `FieldSpec`, `LeafField` from `./schema`; `addItem`, `removeItem`, `updateItem` from `./update`.
- Produces: `function SchemaForm<T>(props: { schema: FormSchema<T>; data: T; onChange: (next: T) => void }): JSX.Element`. Renders the same markup/classes as the original `EditorForm`.

- [ ] **Step 1: Write the failing tests**

Create `src/forms/SchemaForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { builder, type FormSchema } from "./schema";
import { SchemaForm } from "./SchemaForm";

interface Demo {
  name: string;
  contact: { email: string };
  skills: string[];
  items: { id: string; label: string }[];
}

const b = builder<Demo>();
const schema: FormSchema<Demo> = [
  b.section("Basics", [
    b.field("name", "Full name"),
    b.group("contact", (c) => [c.field("email", "Email")]),
    b.tags("skills", "Skills"),
  ]),
  b.list("items", "Items", () => ({ label: "New" }), (it) => [it.field("label", "Label")]),
];

const base: Demo = {
  name: "Ann",
  contact: { email: "a@x.com" },
  skills: ["ts", "go"],
  items: [{ id: "i1", label: "One" }],
};

describe("SchemaForm", () => {
  it("renders section headings, labels and array cards", () => {
    render(<SchemaForm schema={schema} data={base} onChange={() => {}} />);
    expect(screen.getByText("Basics")).toBeInTheDocument();
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("edits a root text field immutably", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Ann"), { target: { value: "Bob" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, name: "Bob" });
  });

  it("edits a nested group field", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("a@x.com"), { target: { value: "b@y.com" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, contact: { email: "b@y.com" } });
  });

  it("joins and splits a stringList losslessly", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("ts,go"), { target: { value: "ts,go,rust" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, skills: ["ts", "go", "rust"] });
  });

  it("adds an array item with a fresh id", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add"));
    const next = onChange.mock.calls[0][0] as Demo;
    expect(next.items.length).toBe(2);
    expect(next.items[1].label).toBe("New");
    expect(typeof next.items[1].id).toBe("string");
  });

  it("removes an array item", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.click(screen.getByText("Remove"));
    expect(onChange).toHaveBeenCalledWith({ ...base, items: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/forms/SchemaForm.test.tsx`
Expected: FAIL — module `./SchemaForm` not found.

- [ ] **Step 3: Implement the renderer**

Create `src/forms/SchemaForm.tsx`:
```tsx
import type { ReactNode } from "react";
import type { Block, FieldNode, FieldSpec, FormSchema, LeafField } from "./schema";
import { addItem, removeItem, updateItem } from "./update";

type Obj = Record<string, any>;
type Item = Obj & { id: string };

/**
 * A labelled field. The control nests INSIDE the <label> for an implicit
 * programmatic association (mirrors the original EditorForm).
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Control({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (spec.control === "textarea") {
    return (
      <textarea
        rows={spec.rows}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (spec.control === "stringList") {
    // Lossless: join on the separator for display, split on the same separator
    // on edit. Split/join are exact inverses, so no caret jumps.
    const text = Array.isArray(value) ? value.join(spec.separator) : "";
    const handle = (s: string) => onChange(s.split(spec.separator));
    return spec.multiline ? (
      <textarea rows={spec.rows} value={text} onChange={(e) => handle(e.target.value)} />
    ) : (
      <input value={text} onChange={(e) => handle(e.target.value)} />
    );
  }
  return (
    <input
      value={(value as string) ?? ""}
      placeholder={spec.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Leaf({
  node,
  value,
  onChange,
}: {
  node: LeafField;
  value: Obj;
  onChange: (next: Obj) => void;
}) {
  return (
    <Field label={node.label}>
      <Control
        spec={node.spec}
        value={value[node.key]}
        onChange={(v) => onChange({ ...value, [node.key]: v })}
      />
    </Field>
  );
}

function Nodes({
  nodes,
  value,
  onChange,
}: {
  nodes: FieldNode[];
  value: Obj;
  onChange: (next: Obj) => void;
}) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "field") {
          return <Leaf key={i} node={node} value={value} onChange={onChange} />;
        }
        if (node.kind === "row") {
          return (
            <div className="field-row" key={i}>
              {node.fields.map((f, j) => (
                <Leaf key={j} node={f} value={value} onChange={onChange} />
              ))}
            </div>
          );
        }
        // group: render children against the nested sub-object scope.
        const sub = (value[node.key] ?? {}) as Obj;
        return (
          <Nodes
            key={i}
            nodes={node.children}
            value={sub}
            onChange={(next) => onChange({ ...value, [node.key]: next })}
          />
        );
      })}
    </>
  );
}

function ArrayBlock({
  block,
  data,
  onChange,
}: {
  block: Extract<Block, { kind: "array" }>;
  data: Obj;
  onChange: (next: Obj) => void;
}) {
  const items = (data[block.key] ?? []) as Item[];
  const setItems = (next: Item[]) => onChange({ ...data, [block.key]: next });
  return (
    <section className="form-section">
      <h2>
        {block.title}
        <button
          type="button"
          className="btn-mini"
          onClick={() => setItems(addItem(items, block.makeItem()))}
        >
          + Add
        </button>
      </h2>
      {items.map((item, i) => (
        <div className="card" key={item.id}>
          <div className="card-head">
            <span className="idx">#{i + 1}</span>
            <button
              type="button"
              className="btn-mini danger"
              onClick={() => setItems(removeItem(items, item.id))}
              aria-label={`Remove ${block.title} ${i + 1}`}
            >
              Remove
            </button>
          </div>
          <Nodes
            nodes={block.itemChildren}
            value={item}
            onChange={(next) => setItems(updateItem(items, item.id, next as Item))}
          />
        </div>
      ))}
    </section>
  );
}

/**
 * Generic, schema-driven editor. Walks the schema and renders the same markup
 * and CSS classes as the original hand-written EditorForm, so a migrated form
 * is visually identical.
 */
export function SchemaForm<T>({
  schema,
  data,
  onChange,
}: {
  schema: FormSchema<T>;
  data: T;
  onChange: (next: T) => void;
}) {
  const value = data as Obj;
  const setValue = onChange as unknown as (next: Obj) => void;
  return (
    <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
      {(schema as Block[]).map((block, i) =>
        block.kind === "array" ? (
          <ArrayBlock key={i} block={block} data={value} onChange={setValue} />
        ) : (
          <section className="form-section" key={i}>
            <h2>{block.title}</h2>
            <Nodes nodes={block.children} value={value} onChange={setValue} />
          </section>
        ),
      )}
    </form>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/forms/SchemaForm.test.tsx`
Expected: PASS — all 6 SchemaForm tests green.

- [ ] **Step 5: Commit**

```bash
git add src/forms/SchemaForm.tsx src/forms/SchemaForm.test.tsx
git commit -m "feat: add generic schema-driven form renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: resume schema and blank-item factories

**Files:**
- Create: `src/documents/resume/schema.ts`
- Test: `src/documents/resume/schema.test.tsx`

**Interfaces:**
- Consumes: `builder`, `FormSchema` from `../../forms/schema`; `ResumeData`, `ExperienceItem`, `EducationItem`, `SkillGroup` from `../../data/resume`; `SchemaForm` (in test) from `../../forms/SchemaForm`; `sampleResume` (in test) from `../../data/resume`.
- Produces:
  - `makeBlankExperience(): Omit<ExperienceItem, "id">`
  - `makeBlankEducation(): Omit<EducationItem, "id">`
  - `makeBlankSkill(): Omit<SkillGroup, "id">`
  - `resumeSchema: FormSchema<ResumeData>`

- [ ] **Step 1: Write the failing tests**

Create `src/documents/resume/schema.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchemaForm } from "../../forms/SchemaForm";
import { resumeSchema, makeBlankExperience, makeBlankSkill } from "./schema";
import { sampleResume } from "../../data/resume";

describe("resumeSchema", () => {
  it("renders all sections and the key field labels", () => {
    render(<SchemaForm schema={resumeSchema} data={sampleResume} onChange={() => {}} />);
    for (const heading of ["Basics", "Summary", "Experience", "Education", "Skills"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    for (const label of [
      "Full name",
      "Headline",
      "Email",
      "Phone",
      "Website",
      "LinkedIn",
      "Professional summary",
      "Role",
      "Company",
      "Bullets (one per line)",
      "Institution",
      "Degree",
      "Detail",
      "Category",
      "Items (comma-separated)",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("renders one card (Remove button) per experience, education and skill entry", () => {
    render(<SchemaForm schema={resumeSchema} data={sampleResume} onChange={() => {}} />);
    const expected =
      sampleResume.experience.length + sampleResume.education.length + sampleResume.skills.length;
    expect(screen.getAllByText("Remove").length).toBe(expected);
  });

  it("blank-item factories match the original add-button defaults", () => {
    expect(makeBlankExperience()).toEqual({
      role: "Job Title",
      company: "Company",
      location: "",
      start: "20XX",
      end: "Present",
      bullets: ["Describe an accomplishment with measurable impact."],
    });
    expect(makeBlankSkill()).toEqual({ label: "Category", items: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/documents/resume/schema.test.tsx`
Expected: FAIL — module `./schema` not found.

- [ ] **Step 3: Implement the resume schema**

Create `src/documents/resume/schema.ts`:
```ts
import { builder, type FormSchema } from "../../forms/schema";
import type {
  EducationItem,
  ExperienceItem,
  ResumeData,
  SkillGroup,
} from "../../data/resume";

/** Defaults for "+ Add" — copied verbatim from the original EditorForm. */
export const makeBlankExperience = (): Omit<ExperienceItem, "id"> => ({
  role: "Job Title",
  company: "Company",
  location: "",
  start: "20XX",
  end: "Present",
  bullets: ["Describe an accomplishment with measurable impact."],
});

export const makeBlankEducation = (): Omit<EducationItem, "id"> => ({
  institution: "Institution",
  degree: "Degree",
  location: "",
  start: "20XX",
  end: "20XX",
  detail: "",
});

export const makeBlankSkill = (): Omit<SkillGroup, "id"> => ({
  label: "Category",
  items: [],
});

const b = builder<ResumeData>();

export const resumeSchema: FormSchema<ResumeData> = [
  b.section("Basics", [
    b.field("name", "Full name"),
    b.field("headline", "Headline"),
    b.group("contact", (c) => [
      c.row(c.field("email", "Email"), c.field("phone", "Phone")),
      c.row(c.field("location", "Location"), c.field("website", "Website")),
      c.field("linkedin", "LinkedIn"),
    ]),
  ]),
  b.section("Summary", [b.textarea("summary", "Professional summary", { rows: 4 })]),
  b.list("experience", "Experience", makeBlankExperience, (e) => [
    e.field("role", "Role"),
    e.row(e.field("company", "Company"), e.field("location", "Location")),
    e.row(e.field("start", "Start"), e.field("end", "End")),
    e.lines("bullets", "Bullets (one per line)", { rows: 4 }),
  ]),
  b.list("education", "Education", makeBlankEducation, (ed) => [
    ed.field("institution", "Institution"),
    ed.field("degree", "Degree"),
    ed.row(ed.field("start", "Start"), ed.field("end", "End")),
    ed.field("location", "Location"),
    ed.field("detail", "Detail"),
  ]),
  b.list("skills", "Skills", makeBlankSkill, (s) => [
    s.field("label", "Category"),
    s.tags("items", "Items (comma-separated)"),
  ]),
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/documents/resume/schema.test.tsx`
Expected: PASS — render-parity and factory tests green.

- [ ] **Step 5: Commit**

```bash
git add src/documents/resume/schema.ts src/documents/resume/schema.test.tsx
git commit -m "feat: express the resume as a form schema

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: DocumentType and registry

**Files:**
- Create: `src/documents/types.ts`
- Create: `src/documents/resume/index.ts`
- Create: `src/documents/registry.ts`
- Test: `src/documents/registry.test.ts`

**Interfaces:**
- Consumes: `Template` from `../templates/types`; `FormSchema` from `../forms/schema`; `resumeSchema` from `./resume/schema`; `sampleResume`, `ResumeData` from `../../data/resume`; `classicTemplate` from `../../templates/classic`.
- Produces:
  - `interface DocumentType<T> { id: string; name: string; schema: FormSchema<T>; defaultData: T; templates: Template[] }`
  - `resumeDocument: DocumentType<ResumeData>`
  - `documents: DocumentType<any>[]`
  - `defaultDocument: DocumentType<any>`

- [ ] **Step 1: Write the failing tests**

Create `src/documents/registry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { documents, defaultDocument } from "./registry";
import { sampleResume } from "../data/resume";

describe("document registry", () => {
  it("includes the resume document and uses it as default", () => {
    expect(defaultDocument.id).toBe("resume");
    expect(documents.map((d) => d.id)).toContain("resume");
  });

  it("seeds the resume with the sample data and at least one template", () => {
    expect(defaultDocument.defaultData).toBe(sampleResume);
    expect(defaultDocument.templates.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/documents/registry.test.ts`
Expected: FAIL — module `./registry` not found.

- [ ] **Step 3: Implement the DocumentType, resume document, and registry**

Create `src/documents/types.ts`:
```ts
import type { Template } from "../templates/types";
import type { FormSchema } from "../forms/schema";

/**
 * A document type bundles everything needed to edit and render a document:
 * the schema that auto-generates its editor form, the seed/reset content, and
 * one or more hand-authored preview templates (the existing design concept).
 *
 * Adding a new document type = new data interface + schema + preview template,
 * then append one entry to the registry. The editor form comes for free.
 */
export interface DocumentType<T> {
  id: string;
  name: string;
  schema: FormSchema<T>;
  defaultData: T;
  templates: Template[];
}
```

Create `src/documents/resume/index.ts`:
```ts
import type { DocumentType } from "../types";
import type { ResumeData } from "../../data/resume";
import { sampleResume } from "../../data/resume";
import { classicTemplate } from "../../templates/classic";
import { resumeSchema } from "./schema";

export const resumeDocument: DocumentType<ResumeData> = {
  id: "resume",
  name: "resume",
  schema: resumeSchema,
  defaultData: sampleResume,
  templates: [classicTemplate],
};
```

Create `src/documents/registry.ts`:
```ts
import type { DocumentType } from "./types";
import { resumeDocument } from "./resume";

/**
 * The list of available document types. To add one: build a new document
 * module that exports a DocumentType and append it here.
 */
export const documents: DocumentType<any>[] = [resumeDocument];

export const defaultDocument = documents[0];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/documents/registry.test.ts`
Expected: PASS — registry tests green.

- [ ] **Step 5: Commit**

```bash
git add src/documents/types.ts src/documents/resume/index.ts src/documents/registry.ts src/documents/registry.test.ts
git commit -m "feat: add DocumentType bundle and document registry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Wire App to the registry + document selector; remove EditorForm

**Files:**
- Modify: `src/App.tsx` (full new contents below)
- Delete: `src/components/EditorForm.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `documents`, `defaultDocument` from `./documents/registry`; `SchemaForm` from `./forms/SchemaForm`; existing `downloadResumePdf`, `theme`, `collectResumeText`, `unsupportedChars`.
- Produces: an `App` that renders `<SchemaForm>` for the active document type's schema and a topbar `<select aria-label="Document type">` to switch types.

- [ ] **Step 1: Write the failing tests**

Create `src/App.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the schema-driven resume editor", () => {
    render(<App />);
    expect(screen.getByText("Basics")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jordan Avery Chen")).toBeInTheDocument();
  });

  it("shows a document-type selector defaulting to the resume", () => {
    render(<App />);
    const select = screen.getByLabelText("Document type") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("resume");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — `getByLabelText("Document type")` not found (no selector yet) / `Basics` heading not present until App uses SchemaForm.

- [ ] **Step 3: Replace `src/App.tsx` with the registry-driven version**

Overwrite `src/App.tsx` with:
```tsx
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { SchemaForm } from "./forms/SchemaForm";
import { documents, defaultDocument } from "./documents/registry";
import { downloadResumePdf } from "./pdf/download";
import { theme } from "./theme/theme";
import { collectResumeText, unsupportedChars } from "./fonts/coverage";

// The page at true physical size, in CSS px (96dpi): pt * 96 / 72.
const PX = 96 / 72;
const PAGE_W_PX = theme.page.width * PX;
const PAGE_H_PX = theme.page.height * PX;

export function App() {
  const [docId, setDocId] = useState<string>(defaultDocument.id);
  const doc = useMemo(
    () => documents.find((d) => d.id === docId) ?? defaultDocument,
    [docId],
  );
  const [data, setData] = useState<any>(defaultDocument.defaultData);
  const Preview = doc.templates[0].Preview;

  const handleDocChange = (id: string) => {
    const next = documents.find((d) => d.id === id) ?? defaultDocument;
    setDocId(next.id);
    setData(next.defaultData); // load that type's seed content
  };

  // Characters the embedded subset fonts cannot render (e.g. CJK, Cyrillic).
  const unsupported = useMemo(() => unsupportedChars(collectResumeText(data)), [data]);

  // Scale the full-size page to fit the preview column.
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frame, setFrame] = useState({ w: PAGE_W_PX, h: PAGE_H_PX });

  // PDF export. The capture copy is mounted ONLY during a download and is fed a
  // FROZEN snapshot of the data so typing mid-export can't change what
  // doc.html() is measuring.
  const pdfSourceRef = useRef<HTMLDivElement>(null);
  const [exportData, setExportData] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe ONCE on mount. The observer watches the stage (width) and the
  // page (content height), so data edits still update the frame without
  // re-subscribing. A rAF + equality guard prevents the classic
  // ResizeObserver/scrollbar feedback loop.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const page = pageRef.current;
    if (!stage || !page) return;

    let raf = 0;
    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const avail = stage.clientWidth - 56; // minus the .preview padding
        const s = Math.min(1, Math.max(0.3, avail / PAGE_W_PX));
        const w = PAGE_W_PX * s;
        const h = page.offsetHeight * s;
        setScale((prev) => (Math.abs(prev - s) < 0.0005 ? prev : s));
        setFrame((prev) =>
          Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5 ? prev : { w, h },
        );
      });
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(stage);
    ro.observe(page);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Once the frozen capture copy has mounted and laid out, export it then unmount.
  useLayoutEffect(() => {
    if (!exportData) return;
    const host = pdfSourceRef.current?.querySelector<HTMLElement>(".resume-page");
    if (!host) {
      setDownloading(false);
      setExportData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await downloadResumePdf(host, "resume.pdf");
      } catch (err) {
        console.error("PDF generation failed:", err);
        if (!cancelled) setError("Could not generate the PDF. Please try again.");
      } finally {
        if (!cancelled) {
          setDownloading(false);
          setExportData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exportData]);

  const handleDownload = () => {
    if (downloading) return;
    setError(null);
    setDownloading(true);
    setExportData(data); // freeze content + mount the offscreen capture copy
  };
  const handleReset = () => setData(doc.defaultData);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Vector resume Builder</h1>
          <span className="tag">live preview · true-vector PDF · 100% offline</span>
        </div>
        <div className="topbar-actions">
          <select
            aria-label="Document type"
            className="doc-select"
            value={doc.id}
            onChange={(e) => handleDocChange(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={handleReset}>
            Reset sample
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : "↓ Download PDF"}
          </button>
        </div>
      </header>

      {error && (
        <div className="warning-bar" role="alert">
          <span>
            <strong>PDF error:</strong> {error}
          </span>
          <button className="bar-dismiss" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {unsupported.length > 0 && (
        <div className="warning-bar" role="alert">
          <span>
            <strong>Heads up:</strong> this template's font can't render{" "}
            {unsupported.slice(0, 12).map((c) => `“${c}”`).join(", ")}
            {unsupported.length > 12 ? " …" : ""}. Those characters will be left out of the PDF.
          </span>
        </div>
      )}

      <div className="workspace">
        <div className="editor">
          <SchemaForm schema={doc.schema} data={data} onChange={setData} />
        </div>

        <div className="preview" ref={stageRef}>
          <div className="page-frame" style={{ width: frame.w, height: frame.h }}>
            <div
              className="page-scaler"
              ref={pageRef}
              style={{ transform: `scale(${scale})`, width: PAGE_W_PX }}
            >
              <Preview data={data} />
            </div>
          </div>
        </div>
      </div>

      {/* Offscreen, true-size capture source for doc.html(). Mounted only during
          a download and fed a frozen snapshot. */}
      {exportData && (
        <div
          ref={pdfSourceRef}
          className="pdf-capture"
          aria-hidden
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: PAGE_W_PX,
            pointerEvents: "none",
          }}
        >
          <Preview data={exportData} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Delete the obsolete EditorForm**

Run:
```bash
git rm src/components/EditorForm.tsx
```
Expected: file removed. (App.tsx no longer imports it; it was the only importer.)

- [ ] **Step 5: Run the App tests to verify they pass**

Run: `npm test -- src/App.test.tsx`
Expected: PASS — both App tests green.

- [ ] **Step 6: Run the full test suite + build**

Run: `npm test`
Expected: PASS — all test files green (update, schema, SchemaForm, resume schema, registry, App, sanity).

Run: `npm run build`
Expected: `tsc --noEmit` passes (no unused imports — note `ResumeData` is no longer imported in App; `EditorForm` import removed) and `vite build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: drive the editor from the document registry via SchemaForm

Removes the hand-written EditorForm in favor of the generic schema engine and
adds a document-type selector.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Manual parity verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: the running dev server.
- Produces: confirmation the migrated resume editor is visually and behaviorally identical to the pre-migration form.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite serves the app (default `http://localhost:5173`).

- [ ] **Step 2: Verify editor parity**

Confirm in the browser:
- Sections render in order: Basics, Summary, Experience, Education, Skills.
- Basics shows Full name, Headline, then the contact rows (Email + Phone, Location + Website) and LinkedIn.
- Experience/Education/Skills each show `#n` cards with `+ Add` and `Remove`.
- Typing in any field updates the live preview instantly.
- `+ Add` appends a card with the same placeholder defaults as before; `Remove` deletes it.
- Bullets edit one-per-line; skill items edit comma-separated, both without caret jumps.
- "Reset sample" restores the sample resume.
- The "Document type" selector shows "resume".

- [ ] **Step 3: Verify PDF export still works**

Click "↓ Download PDF". Expected: a `resume.pdf` downloads with selectable text, matching the preview (unchanged from before migration).

- [ ] **Step 4: Stop the dev server and finalize**

Stop the server (Ctrl-C). The branch `feat/schema-driven-form` now contains the complete feature across 7 commits.

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-24-schema-driven-editor-form-design.md`):

| Spec section | Implemented by |
|---|---|
| §2.1 DocumentType bundle | Task 6 (`types.ts`) |
| §2.3 file structure (forms/, documents/) | Tasks 2–7 |
| §3 schema model: text/textarea/stringList/group/array/row | Task 3 (types + builders), Task 4 (rendering) |
| §3.2 builders | Task 3 |
| §3.3 resume schema | Task 5 |
| §4 SchemaForm renderer, same CSS classes, immutable updates, stringList losslessness | Task 4 |
| §4.2 id generation reused | Task 2 (`newId`) |
| §5 registry + App wiring + selector | Tasks 6, 7 |
| §5 Reset restores defaultData | Task 7 (`handleReset`) |
| §6 EditorForm removed; parity acceptance bar | Task 7 (delete), Task 8 (manual parity) |
| §7 testing: unit updates, stringList, render parity, behavior | Tasks 2, 4, 5 |
| §6 out-of-scope (validation, reorder, generic font-coverage, runtime schemas) | Not implemented — intentional |

No gaps found. `collectResumeText` stays resume-shaped (spec §6 out-of-scope), called against `data: any` — typechecks.

**2. Placeholder scan:** No "TBD"/"TODO"/"handle edge cases"/"similar to Task N" present. Every code step shows complete code; every command step shows exact command + expected output.

**3. Type consistency:** Node discriminant is `kind` everywhere (`field`/`row`/`group`/`section`/`array`). Builder methods (`field`, `textarea`, `lines`, `tags`, `row`, `group`, `section`, `list`) are named identically in the type defs (Task 3), the resume schema (Task 5), and the tests (Tasks 3–5). Update helper names (`newId`, `setKey`, `addItem`, `updateItem`, `removeItem`) match between Task 2 definitions and Task 4 consumption. `FieldSpec.stringList` carries `separator`/`multiline`/`rows` consistently in Task 3 and is read identically in Task 4's `Control`. `DocumentType<T>` fields (`id`, `name`, `schema`, `defaultData`, `templates`) match between Task 6 definition and Task 7 consumption (`doc.schema`, `doc.templates[0].Preview`, `doc.defaultData`).

**Known minor deviation (intentional):** array item `aria-label`s become `Remove ${title} N` (e.g. "Remove Experience 1") rather than the original lowercase phrasings ("Remove experience 1", "Remove skill group 1"). Screen-reader-only wording; no functional/visual change. Acceptable under the parity bar.
