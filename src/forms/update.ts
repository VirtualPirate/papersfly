/** Reused verbatim from the original EditorForm id strategy. */
export const newId = (): string =>
  crypto.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;

/** Return a copy of `obj` with `key` set to `value`. */
export function setKey<O>(obj: O, key: keyof O, value: unknown): O {
  return { ...obj, [key]: value };
}

/** Append `item` (without an id) to `arr`, assigning a fresh id. */
export function addItem<I extends { id: string }>(arr: I[], item: Omit<I, "id">): I[] {
  return [...arr, { ...(item as object), id: newId() } as I];
}

/** Replace the element whose id matches with `next`. */
export function updateItem<I extends { id: string }>(arr: I[], id: string, next: I): I[] {
  return arr.map((it) => (it.id === id ? next : it));
}

/** Remove the element whose id matches. */
export function removeItem<I extends { id: string }>(arr: I[], id: string): I[] {
  return arr.filter((it) => it.id !== id);
}
