import type { Template } from "../types";
import { classicTemplate } from "./classic";
import { meridianTemplate } from "./meridian";
import { quillTemplate } from "./quill";
import { ledgerTemplate } from "./ledger";
import { atlasTemplate } from "./atlas";

/**
 * The list of available designs. To add a template: build a new module that
 * exports a `Template` (a Preview component over ResumeData) and add it here.
 * Content stays in `data/resume.ts`; only the design differs.
 */
export const templates: Template[] = [
  classicTemplate, meridianTemplate, quillTemplate, ledgerTemplate, atlasTemplate,
];

export const defaultTemplate = templates[0];
