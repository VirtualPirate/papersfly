import { createContext, useContext, type ReactNode } from "react";
import type { Block, FieldNode, FieldSpec, FormSchema, LeafField } from "./schema";
import { addItem, removeItem, updateItem } from "./update";
import { FontPicker } from "./FontPicker";
import { joinPath, type FontOverrides } from "@/fonts/overrides";
import type { FontId } from "@/fonts/library";
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

interface FontFieldCtx {
  overrides: FontOverrides;
  onFontChange: (path: string, id: FontId | null) => void;
}
const FontFieldContext = createContext<FontFieldCtx>({
  overrides: {},
  onFontChange: () => {},
});

/** Label wraps its control (a real <label>) so clicking the text focuses the
   field. The font picker is a sibling (NOT inside the label) positioned over the
   control's trailing edge, so activating it never focuses the input. */
function Field({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative mb-3">
      <Label className="flex flex-col items-start gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </Label>
      {trailing}
    </div>
  );
}

function Control({
  spec,
  value,
  onChange,
  className,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  className?: string;
}) {
  if (spec.control === "textarea") {
    return (
      <Textarea
        rows={spec.rows}
        className={className}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (spec.control === "stringList") {
    const text = Array.isArray(value) ? value.join(spec.separator) : "";
    const handle = (s: string) => onChange(s.split(spec.separator));
    return spec.multiline ? (
      <Textarea rows={spec.rows} className={className} value={text} onChange={(e) => handle(e.target.value)} />
    ) : (
      <Input className={className} value={text} onChange={(e) => handle(e.target.value)} />
    );
  }
  return (
    <Input
      className={className}
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
  path,
}: {
  node: LeafField;
  value: Obj;
  onChange: (next: Obj) => void;
  path: string;
}) {
  const { overrides, onFontChange } = useContext(FontFieldContext);
  return (
    <Field
      label={node.label}
      trailing={
        <FontPicker
          className="absolute right-1.5 top-7"
          path={path}
          label={node.label}
          value={overrides[path] ?? null}
          onChange={(id) => onFontChange(path, id)}
        />
      }
    >
      <Control
        spec={node.spec}
        value={value[node.key]}
        onChange={(v) => onChange({ ...value, [node.key]: v })}
        className="pr-9"
      />
    </Field>
  );
}

function Nodes({
  nodes,
  value,
  onChange,
  path = "",
}: {
  nodes: FieldNode[];
  value: Obj;
  onChange: (next: Obj) => void;
  path?: string;
}) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "field") {
          return (
            <Leaf key={i} node={node} value={value} onChange={onChange} path={joinPath(path, node.key)} />
          );
        }
        if (node.kind === "row") {
          return (
            <div className="grid grid-cols-2 gap-3" key={i}>
              {node.fields.map((f, j) => (
                <Leaf key={j} node={f} value={value} onChange={onChange} path={joinPath(path, f.key)} />
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
            path={joinPath(path, node.key)}
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
            path={`${block.key}.${item.id}`}
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
  fontOverrides = {},
  onFontChange = () => {},
}: {
  schema: FormSchema<T>;
  data: T;
  onChange: (next: T) => void;
  fontOverrides?: FontOverrides;
  onFontChange?: (path: string, id: FontId | null) => void;
}) {
  const value = data as Obj;
  const setValue = onChange as unknown as (next: Obj) => void;
  const blocks = schema as Block[];
  return (
    <FontFieldContext.Provider value={{ overrides: fontOverrides, onFontChange }}>
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
    </FontFieldContext.Provider>
  );
}
