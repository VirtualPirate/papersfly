import type { ReactNode } from "react";
import type { Block, FieldNode, FieldSpec, FormSchema, LeafField } from "./schema";
import { addItem, removeItem, updateItem } from "./update";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

type Obj = Record<string, any>;
type Item = Obj & { id: string };

/** Label wraps its control (a real <label>), so clicking the text focuses the
   field and screen readers announce it — no id/htmlFor wiring needed. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="mb-3 flex flex-col items-start gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </Label>
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
      <Textarea
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
      <Textarea rows={spec.rows} value={text} onChange={(e) => handle(e.target.value)} />
    ) : (
      <Input value={text} onChange={(e) => handle(e.target.value)} />
    );
  }
  return (
    <Input
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
            <div className="grid grid-cols-2 gap-3" key={i}>
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

function ArrayItems({
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
    <div className="space-y-3">
      {items.map((item, i) => (
        <Card key={item.id} className="gap-0 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setItems(removeItem(items, item.id))}
              aria-label={`Remove ${block.title} ${i + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Nodes
            nodes={block.itemChildren}
            value={item}
            onChange={(next) => setItems(updateItem(items, item.id, next as Item))}
          />
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setItems(addItem(items, block.makeItem()))}
      >
        <Plus className="size-4" /> Add {block.title}
      </Button>
    </div>
  );
}

/**
 * Generic, schema-driven editor. Each top-level block (section or list) is an
 * accordion panel; the first (Basics) is open by default. Editing emits a new
 * immutable data object via the helpers in ./update.
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
  const blocks = schema as Block[];
  return (
    <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
      <Accordion type="multiple" defaultValue={["section-0"]}>
        {blocks.map((block, i) => (
          <AccordionItem key={i} value={`section-${i}`}>
            <AccordionTrigger>{block.title}</AccordionTrigger>
            <AccordionContent>
              {block.kind === "array" ? (
                <ArrayItems block={block} data={value} onChange={setValue} />
              ) : (
                <Nodes nodes={block.children} value={value} onChange={setValue} />
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </form>
  );
}
