import { Check } from "lucide-react";
import type { ColorScheme, FontPairing, SpacingPreset, Variant } from "@/theme/variants";
import { DEFAULT_SPACING_ID } from "@/theme/variants";
import { fontStack, getFont } from "@/fonts/library";
import { cn } from "@/lib/utils";

export interface VariantPickerProps {
  colors: ColorScheme[];
  fonts: FontPairing[];
  spacings: SpacingPreset[];
  value: Variant;
  onChange: (next: Variant) => void;
}

/** "Source Serif + Inter", or just "IBM Plex Sans" when one family fills both slots. */
function pairingSubtitle(fp: FontPairing): string {
  const display = getFont(fp.display)?.name ?? "";
  const body = getFont(fp.body)?.name ?? "";
  return fp.display === fp.body ? display : `${display} + ${body}`;
}

/**
 * Template-wide color + font picker — the content of the Style popover. Each
 * option is its own live demo: the color swatch is filled with its accent, the
 * font tile shows "Ag" set in that pairing's display face. Selecting one emits a
 * new Variant with only the changed axis replaced; the live preview re-renders
 * instantly (no apply step — the change lands on click).
 */
export function VariantPicker({ colors, fonts, spacings, value, onChange }: VariantPickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Color
        </span>
        <div role="group" aria-label="Color scheme" className="flex flex-wrap gap-2.5">
          {colors.map((c) => {
            const active = c.id === value.colorId;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                aria-pressed={active}
                title={c.name}
                onClick={() => onChange({ ...value, colorId: c.id })}
                className={cn(
                  "grid size-6 place-items-center rounded-full text-white ring-offset-2 ring-offset-background transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "ring-2 ring-foreground"
                    : "ring-1 ring-border hover:ring-foreground/40",
                )}
                style={{ backgroundColor: c.accent }}
              >
                {active && <Check className="size-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-border" />

      <section className="flex flex-col gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Font
        </span>
        <div role="group" aria-label="Font pairing" className="grid grid-cols-2 gap-2">
          {fonts.map((fp) => {
            const active = fp.id === value.fontId;
            return (
              <button
                key={fp.id}
                type="button"
                aria-label={fp.name}
                aria-pressed={active}
                onClick={() => onChange({ ...value, fontId: fp.id })}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-2.5 py-2 text-left transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-foreground bg-accent"
                    : "border-border hover:border-foreground/40",
                )}
              >
                <span
                  className="text-xl leading-none text-foreground"
                  style={{ fontFamily: fontStack(fp.display) }}
                  aria-hidden
                >
                  Ag
                </span>
                <span className="text-xs font-medium leading-tight text-foreground">{fp.name}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {pairingSubtitle(fp)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-border" />

      <section className="flex flex-col gap-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Spacing
        </span>
        <div role="group" aria-label="Section spacing" className="grid grid-cols-3 gap-2">
          {spacings.map((s) => {
            const active = (value.spacingId ?? DEFAULT_SPACING_ID) === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.name}
                aria-pressed={active}
                onClick={() => onChange({ ...value, spacingId: s.id })}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-foreground bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/40",
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
