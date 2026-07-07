import type { ComponentType } from "react";
import type { ResumeData } from "../data/resume";
import type { FontOverrides } from "../fonts/overrides";
import type { FormSchema } from "../forms/schema";
import type { ColorScheme, FontPairing, Variant } from "../theme/variants";

export interface TemplateVariants {
  colors: ColorScheme[];
  fonts: FontPairing[];
  default: Variant;
}

/**
 * A template is a self-contained design over `ResumeData`, rendered as HTML/CSS.
 * The same rendered markup is BOTH the live preview and the source the PDF is
 * generated from (via `doc.html()`), so the design is authored once.
 *
 * Adding a new design = add a module that exports one `Template`, then list it
 * in `registry.ts`. Content (data) never changes; only the design does.
 */
export interface Template {
  id: string;
  name: string;
  /** Short one-line design description, shown on the gallery card. */
  description?: string;
  /** Form schema for editing this template's data. Each template owns its own schema. */
  schema: FormSchema<ResumeData>;
  /** The color schemes + font pairings this template offers, plus its default. */
  variants: TemplateVariants;
  /**
   * Live HTML/CSS preview — also the exact source the PDF is drawn from.
   *
   * Lazy: the underlying component (and its CSS) live in the template's own
   * build-time chunk, fetched on demand via dynamic `import()`. Render it behind
   * a `<Suspense>` boundary.
   */
  Preview: ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }>;
  /**
   * Resolve the template's chunk and return the concrete component. Awaiting
   * this guarantees the component renders synchronously on its next mount —
   * which the PDF export relies on (it queries `.resume-page` immediately after
   * mounting an offscreen capture copy, so a still-suspended lazy component
   * would make the export silently no-op).
   */
  preload: () => Promise<ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }>>;
}
