import type { DocumentType } from "./types";
import { resumeDocument } from "./resume";

/**
 * The list of available document types. To add one: build a new document
 * module that exports a DocumentType and append it here.
 */
export const documents: DocumentType<any>[] = [resumeDocument];

export const defaultDocument = documents[0];
