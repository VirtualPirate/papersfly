import type { ReactNode } from "react";
import type { Block, FieldNode, FieldSpec, FormSchema, LeafField } from "./schema";
import { addItem, removeItem, updateItem } from "./update";

type Obj = Record<string, any>;
type Item = Obj & { id: string };

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
