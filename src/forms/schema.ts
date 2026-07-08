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
  | { control: "stringList"; separator: string; multiline: boolean; rows?: number }
  | { control: "number"; placeholder?: string; step?: number; min?: number }
  | { control: "select"; options: { value: string; label: string }[] };

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

/** A document's form schema. `_T` documents the data type the builder enforced (phantom). */
export type FormSchema<_T> = Block[];

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
  /** Numeric input; coerces to a number (empty ⇒ 0, invalid ⇒ previous value). */
  number(key: Key<S>, label: string, opts?: { placeholder?: string; step?: number; min?: number }): LeafField;
  /** Native single-select emitting the chosen option value (a string). */
  select(key: Key<S>, label: string, options: { value: string; label: string }[]): LeafField;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    number: (key: string, label: string, opts?: { placeholder?: string; step?: number; min?: number }) => ({
      kind: "field",
      key,
      label,
      spec: { control: "number", ...opts },
    }),
    select: (key: string, label: string, options: { value: string; label: string }[]) => ({
      kind: "field",
      key,
      label,
      spec: { control: "select", options },
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
