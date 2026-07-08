import type { Template } from "../templates/types";
import type { ImportSpec } from "../import/spec";

/**
 * A document type bundles everything needed to edit and render a document:
 * the seed/reset content and one or more hand-authored preview templates.
 * Each template owns its own form schema (see Template.schema).
 *
 * Adding a new document type = new data interface + a template with its schema,
 * then append one entry to the registry. The editor form comes for free.
 */
export interface DocumentType<T> {
  id: string;
  name: string;
  defaultData: T;
  /** Content contract the AI-import prompt + validator are generated from. */
  importSpec: ImportSpec;
  templates: Template<T>[];
  /** Flatten every user-entered string into one blob for the font-coverage scan. */
  collectText: (data: T) => string;
}
