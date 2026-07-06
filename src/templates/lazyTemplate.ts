import { lazy, type ComponentType } from "react";
import type { ResumeData } from "../data/resume";
import type { FontOverrides } from "../fonts/overrides";
import type { Template } from "./types";

type PreviewModule = {
  default: ComponentType<{ data: ResumeData; fontOverrides?: FontOverrides }>;
};

/**
 * Wire a template to its own build-time chunk.
 *
 * `load` must be a BARE dynamic import of the component module — e.g.
 * `() => import("./ClassicPreview")` — whose DEFAULT export is the Preview
 * component. Because that module is reached only through this `import()`, Rollup
 * emits the component (and any CSS it side-effect imports) in a separate chunk,
 * so the entry bundle never grows as templates are added.
 *
 * This is the single place the lazy/preload contract lives: `Preview` is lazy
 * for the live preview, while `preload()` resolves the chunk to the CONCRETE
 * component so callers (the PDF export) can mount it synchronously. Adding a
 * template is then just a folder + one `lazyTemplate(meta, () => import(...))`.
 */
export function lazyTemplate(
  meta: { id: string; name: string; description?: string },
  load: () => Promise<PreviewModule>,
): Template {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    Preview: lazy(load),
    preload: () => load().then((m) => m.default),
  };
}
