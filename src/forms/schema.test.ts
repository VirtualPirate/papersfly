import { describe, it, expect } from "vitest";
import { builder } from "./schema";

interface Demo {
  name: string;
  tags: string[];
  contact: { email: string };
  items: { id: string; label: string }[];
}

describe("builder", () => {
  const b = builder<Demo>();

  it("field defaults to a text control", () => {
    expect(b.field("name", "Name")).toEqual({
      kind: "field",
      key: "name",
      label: "Name",
      spec: { control: "text" },
    });
  });

  it("tags produces a comma-separated stringList", () => {
    expect(b.tags("tags", "Tags").spec).toEqual({
      control: "stringList",
      separator: ",",
      multiline: false,
    });
  });

  it("lines produces a newline multiline stringList", () => {
    expect(b.lines("tags", "Tags", { rows: 4 }).spec).toEqual({
      control: "stringList",
      separator: "\n",
      multiline: true,
      rows: 4,
    });
  });

  it("group nests children built with the sub-scope builder", () => {
    const g = b.group("contact", (c) => [c.field("email", "Email")]);
    expect(g).toEqual({
      kind: "group",
      key: "contact",
      children: [{ kind: "field", key: "email", label: "Email", spec: { control: "text" } }],
    });
  });

  it("list captures key, title, makeItem and item children", () => {
    const node = b.list("items", "Items", () => ({ label: "" }), (it) => [
      it.field("label", "Label"),
    ]);
    expect(node.kind).toBe("array");
    expect(node.key).toBe("items");
    expect(node.title).toBe("Items");
    expect(node.itemChildren).toEqual([
      { kind: "field", key: "label", label: "Label", spec: { control: "text" } },
    ]);
    expect(node.makeItem()).toEqual({ label: "" });
  });

  it("section wraps field nodes", () => {
    const s = b.section("Basics", [b.field("name", "Name")]);
    expect(s.kind).toBe("section");
    expect(s.title).toBe("Basics");
    expect(s.children.length).toBe(1);
  });
});
