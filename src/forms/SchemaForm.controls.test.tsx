import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "./SchemaForm";
import { builder, type FormSchema } from "./schema";

interface Row { amount: number; kind: "percent" | "amount" }
const b = builder<Row>();
const schema: FormSchema<Row> = [
  b.section("Row", [
    b.number("amount", "Amount"),
    b.select("kind", "Kind", [
      { value: "percent", label: "Percent (%)" },
      { value: "amount", label: "Fixed amount" },
    ]),
  ]),
];

describe("number + select controls", () => {
  it("number control emits a numeric value", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={{ amount: 0, kind: "percent" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42.5" } });
    expect(onChange).toHaveBeenCalledWith({ amount: 42.5, kind: "percent" });
  });

  it("select control emits the chosen option value", () => {
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} data={{ amount: 0, kind: "percent" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Kind"), { target: { value: "amount" } });
    expect(onChange).toHaveBeenCalledWith({ amount: 0, kind: "amount" });
  });
});
