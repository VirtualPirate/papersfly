import { describe, it, expect } from "vitest";
import { newId, setKey, addItem, updateItem, removeItem } from "./update";

describe("newId", () => {
  it("returns a non-empty string", () => {
    expect(typeof newId()).toBe("string");
    expect(newId().length).toBeGreaterThan(0);
  });
  it("returns distinct values across calls", () => {
    expect(newId()).not.toBe(newId());
  });
});

describe("setKey", () => {
  it("sets a key immutably", () => {
    const o = { a: 1, b: 2 };
    const r = setKey(o, "a", 9);
    expect(r).toEqual({ a: 9, b: 2 });
    expect(o.a).toBe(1); // original untouched
  });
});

describe("array helpers", () => {
  const arr = [
    { id: "x", v: 1 },
    { id: "y", v: 2 },
  ];

  it("addItem appends with a fresh id and does not mutate", () => {
    const r = addItem(arr, { v: 3 });
    expect(r.length).toBe(3);
    expect(r[2].v).toBe(3);
    expect(typeof r[2].id).toBe("string");
    expect(r[2].id.length).toBeGreaterThan(0);
    expect(arr.length).toBe(2);
  });

  it("updateItem replaces the matching item by id", () => {
    const r = updateItem(arr, "y", { id: "y", v: 99 });
    expect(r).toEqual([
      { id: "x", v: 1 },
      { id: "y", v: 99 },
    ]);
    expect(arr[1].v).toBe(2);
  });

  it("removeItem filters out the matching id", () => {
    const r = removeItem(arr, "x");
    expect(r).toEqual([{ id: "y", v: 2 }]);
    expect(arr.length).toBe(2);
  });
});
