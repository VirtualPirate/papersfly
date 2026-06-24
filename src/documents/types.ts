import type { Template } from "../templates/types";
import type { FormSchema } from "../forms/schema";

/**
 * A document type bundles everything needed to edit and render a document:
 * the schema that auto-generates its editor form, the seed/reset content, and
 * one or more hand-authored preview templates (the existing design concept).
 *
 * Adding a new document type = new data interface + schema + preview template,
 * then append one entry to the registry. The editor form comes for free.
 */
export interface DocumentType<T> {
  id: string;
  name: string;
  schema: FormSchema<T>;
  defaultData: T;
  templates: Template[];
}
