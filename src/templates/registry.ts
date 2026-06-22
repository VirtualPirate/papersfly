import type { Template } from "./types";
import { classicTemplate } from "./classic";

/**
 * The list of available designs. To add a template: build a new module that
 * exports a `Template` (a Preview component + a toPdf writer over ResumeData)
 * and add it here. Content stays in `data/resume.ts`; only the design differs.
 */
export const templates: Template[] = [classicTemplate];

export const defaultTemplate = templates[0];

export function getTemplate(id: string): Template {
  return templates.find((t) => t.id === id) ?? defaultTemplate;
}
