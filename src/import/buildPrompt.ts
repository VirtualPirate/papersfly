import type { DocumentType } from "../documents/types";
import type { ImportNode, ImportSpec } from "./spec";
import { stripIds } from "./spec";

function outlineNode(node: ImportNode): string {
  switch (node.type) {
    case "string": return "text";
    case "strings": return "[text, …]";
    case "number": return "number";
    case "object": return outline(node.fields);
    case "list": return `[ ${outline(node.item)} ]`;
  }
}

function outline(spec: ImportSpec): string {
  return `{ ${Object.entries(spec).map(([k, n]) => `"${k}": ${outlineNode(n)}`).join(", ")} }`;
}

/** The copyable prompt. The type outline and the validator share `importSpec`,
 *  and the example is a real instance of the document — so the prompt describes
 *  exactly what validateAgainstSpec accepts. */
export function buildImportPrompt(doc: DocumentType<unknown>): string {
  const noun = doc.name.toLowerCase();
  const example = JSON.stringify(stripIds(doc.defaultData), null, 2);
  return [
    `You are a ${noun} data extractor. I will attach my ${noun}. Read it and reply with a single JSON object and nothing else.`,
    "",
    "Rules:",
    "- Output ONLY the JSON. No explanations, no markdown code fences.",
    "- Use exactly the keys shown below. Do not add any keys that aren't listed.",
    '- If something is unknown, use "" for text and [] for lists. Never invent facts.',
    "- Every value is text (a string). Put years and dates in quotes.",
    '- Do not include any "id" fields.',
    "",
    "The JSON must match this exact shape (types shown):",
    outline(doc.importSpec),
    "",
    "Here is a filled example — copy its structure exactly:",
    example,
  ].join("\n");
}
