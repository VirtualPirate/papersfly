import type { ComponentType } from "react";
import type { jsPDF } from "jspdf";
import type { ResumeData } from "../data/resume";

/**
 * A template is a self-contained design with two parallel renderers over the
 * same `ResumeData`:
 *
 *  - `Preview`  — a React component that renders the design as HTML/CSS.
 *  - `toPdf`    — maps the same layout into jsPDF vector draw calls.
 *
 * Adding a new design = add a new module that exports one `Template`, then list
 * it in `registry.ts`. Content (data) never changes; only the design does.
 */
export interface Template {
  id: string;
  name: string;
  /** Live HTML/CSS preview. */
  Preview: ComponentType<{ data: ResumeData }>;
  /**
   * Draw the resume into the given jsPDF document as selectable vector text and
   * shapes. Fonts are already registered by the caller.
   */
  toPdf: (doc: jsPDF, data: ResumeData) => void;
}
