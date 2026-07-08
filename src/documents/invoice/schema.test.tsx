import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaForm } from "../../forms/SchemaForm";
import { invoiceSchema, makeBlankItem, makeBlankTax } from "./schema";
import { sampleInvoice } from "../../data/invoice";

function expandAll() {
  for (const name of ["Parties", "Line items", "Adjustments", "Payment"]) {
    fireEvent.click(screen.getByRole("button", { name }));
  }
}

describe("invoiceSchema", () => {
  it("renders every section and key label", () => {
    render(<SchemaForm schema={invoiceSchema} data={sampleInvoice} onChange={() => {}} />);
    for (const heading of ["Details", "Parties", "Line items", "Adjustments", "Payment"]) {
      expect(screen.getByRole("button", { name: heading })).toBeInTheDocument();
    }
    expandAll();
    for (const label of ["Invoice number", "Currency", "Description", "Rate", "Discount type", "Notes"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("blank-item factories return the documented defaults", () => {
    expect(makeBlankItem()).toEqual({ description: "Item", detail: "", quantity: 1, unit: "", rate: 0 });
    expect(makeBlankTax()).toEqual({ label: "Tax", rate: 0 });
  });
});
