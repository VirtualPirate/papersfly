import type { ComponentType } from "react";
import type { ResumeData } from "../data/resume";

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
  /**
   * Live HTML/CSS preview — also the exact source the PDF is drawn from.
   *
   * Lazy: the underlying component (and its CSS) live in the template's own
   * build-time chunk, fetched on demand via dynamic `import()`. Render it behind
   * a `<Suspense>` boundary.
   */
  Preview: ComponentType<{ data: ResumeData }>;
  /**
   * Resolve the template's chunk and return the concrete component. Awaiting
   * this guarantees the component renders synchronously on its next mount —
   * which the PDF export relies on (it queries `.resume-page` immediately after
   * mounting an offscreen capture copy, so a still-suspended lazy component
   * would make the export silently no-op).
   */
  preload: () => Promise<ComponentType<{ data: ResumeData }>>;
}
