import { DropdownMenu as DM } from "radix-ui";
import { Check, EllipsisVertical } from "lucide-react";
import {
  FONT_CATEGORIES, fontsByCategory, getFont, type FontId,
} from "@/fonts/library";
import { cn } from "@/lib/utils";

export interface FontPickerProps {
  /** Current override for the field, or null for the template default. */
  value: FontId | null;
  onChange: (id: FontId | null) => void;
  /** Field label, used in the trigger's accessible name. */
  label?: string;
  /** Stable field path, exposed as data-path for testing/debugging. */
  path?: string;
  className?: string;
}

export function FontPicker({ value, onChange, label, path, className }: FontPickerProps) {
  const active = value != null;
  const current = value ? getFont(value)?.name ?? value : "default";
  const forLabel = label ? ` for ${label}` : "";

  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          type="button"
          data-path={path}
          data-active={active}
          aria-label={`Font${forLabel}: ${current}`}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded text-muted-foreground/70",
            "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "data-[active=true]:text-foreground data-[state=open]:bg-accent",
            className,
          )}
        >
          <EllipsisVertical className="size-4" />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <DM.Item
            onSelect={() => onChange(null)}
            className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
          >
            {value == null && <Check className="size-3.5" />}
            <span className={value == null ? "" : "pl-[1.375rem]"}>Default</span>
          </DM.Item>
          <DM.Separator className="-mx-1 my-1 h-px bg-border" />
          {FONT_CATEGORIES.map((cat) => {
            const fonts = fontsByCategory(cat.key);
            if (fonts.length === 0) return null;
            return (
              <DM.Group key={cat.key}>
                <DM.Label className="px-2 py-1 text-xs text-muted-foreground">
                  {cat.title}
                </DM.Label>
                {fonts.map((f) => (
                  <DM.Item
                    key={f.id}
                    onSelect={() => onChange(f.id)}
                    style={{ fontFamily: f.stack }}
                    className="relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                  >
                    {value === f.id && <Check className="size-3.5" />}
                    <span className={value === f.id ? "" : "pl-[1.375rem]"}>{f.name}</span>
                  </DM.Item>
                ))}
              </DM.Group>
            );
          })}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
