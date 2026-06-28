import type { DocumentType } from "../documents/types";

/** The builder route for a given document type + template, e.g. /build/resume/classic. */
export function builderHref(docId: string, templateId: string): string {
  return `/build/${docId}/${templateId}`;
}

/**
 * Flatten the registry into one { doc, template } pair per template of each
 * document — the static params for the /build/[doc]/[template] route.
 */
export function buildBuilderPaths(
  documents: DocumentType<unknown>[],
): { doc: string; template: string }[] {
  return documents.flatMap((doc) =>
    doc.templates.map((template) => ({ doc: doc.id, template: template.id })),
  );
}
