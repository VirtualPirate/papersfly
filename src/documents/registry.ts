import type { DocumentType } from "./types";
import { resumeDocument } from "./resume";
import { invoiceDocument } from "./invoice";
import { coverLetterDocument } from "./cover-letter";

/**
 * The list of available document types. To add one: build a new document
 * module that exports a DocumentType and append it here.
 */
export const documents: DocumentType<any>[] = [resumeDocument, invoiceDocument, coverLetterDocument];

export const defaultDocument = documents[0];
