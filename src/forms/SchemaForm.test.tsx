import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { builder, type FormSchema } from "./schema";
import { SchemaForm } from "./SchemaForm";

interface Demo {
  name: string;
  contact: { email: string };
  skills: string[];
  items: { id: string; label: string }[];
}

const b = builder<Demo>();
const schema: FormSchema<Demo> = [
  b.section("Basics", [
    b.field("name", "Full name"),
    b.group("contact", (c) => [c.field("email", "Email")]),
    b.tags("skills", "Skills"),
  ]),
  b.list("items", "Items", () => ({ label: "New" }), (it) => [it.field("label", "Label")]),
];

const base: Demo = {
  name: "Ann",
  contact: { email: "a@x.com" },
  skills: ["ts", "go"],
  items: [{ id: "i1", label: "One" }],
};

/** The "Items" list is the 2nd top-level block, collapsed by default. */
function expandItems() {
  fireEvent.click(screen.getByRole("button", { name: "Items" }));
}

describe("SchemaForm", () => {
  it("renders section triggers; Basics is open, lists are collapsed", () => {
    render(<SchemaForm schema={schema} data={base} onChange={() => {}} />);
    // Accordion triggers (always rendered):
    expect(screen.getByRole("button", { name: "Basics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Items" })).toBeInTheDocument();
    // Basics content is open:
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    // Items content is collapsed (not mounted) until expanded:
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
    expandItems();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("edits a root text field immutably", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Ann"), { target: { value: "Bob" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, name: "Bob" });
  });

  it("edits a nested group field", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("a@x.com"), { target: { value: "b@y.com" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, contact: { email: "b@y.com" } });
  });

  it("joins and splits a stringList losslessly", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("ts,go"), { target: { value: "ts,go,rust" } });
    expect(onChange).toHaveBeenCalledWith({ ...base, skills: ["ts", "go", "rust"] });
  });

  it("adds an array item with a fresh id", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    expandItems();
    fireEvent.click(screen.getByRole("button", { name: /add items/i }));
    const next = onChange.mock.calls[0][0] as Demo;
    expect(next.items.length).toBe(2);
    expect(next.items[1].label).toBe("New");
    expect(typeof next.items[1].id).toBe("string");
  });

  it("removes an array item", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={base} onChange={onChange} />);
    expandItems();
    fireEvent.click(screen.getByRole("button", { name: "Remove Items 1" }));
    expect(onChange).toHaveBeenCalledWith({ ...base, items: [] });
  });
});
