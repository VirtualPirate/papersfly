import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrismPreview } from "./PrismPreview";
import { sampleInvoice } from "../../../data/invoice";

describe("PrismPreview", () => {
  it("renders the balance due, a line item, and a .resume-page root", () => {
    const { container } = render(<PrismPreview data={sampleInvoice} />);
    expect(container.querySelector(".resume-page")).toBeTruthy();
    expect(screen.getByText("Brand identity system")).toBeInTheDocument();
    expect(screen.getByText("$13,048.43")).toBeInTheDocument();
    expect(screen.getByText("Cascadia Coffee Roasters")).toBeInTheDocument();
  });

  it("hides the discount, PO and deposit rows when those fields are empty", () => {
    const bare = {
      ...sampleInvoice, poNumber: "", discountValue: 0, taxes: [], amountPaid: 0,
    };
    render(<PrismPreview data={bare} />);
    expect(screen.queryByText(sampleInvoice.discountLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(/PO-/)).not.toBeInTheDocument();
    expect(screen.queryByText(sampleInvoice.amountPaidLabel)).not.toBeInTheDocument();
  });
});
