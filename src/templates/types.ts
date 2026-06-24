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
  /** Live HTML/CSS preview — also the exact source the PDF is drawn from. */
  Preview: ComponentType<{ data: ResumeData }>;
}
