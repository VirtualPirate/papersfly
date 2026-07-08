import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SterlingPreview } from "./SterlingPreview";
import { sampleInvoice } from "../../../data/invoice";

describe("SterlingPreview", () => {
  it("renders the masthead, a line item, the balance and a .resume-page root", () => {
    const { container } = render(<SterlingPreview data={sampleInvoice} />);
    expect(container.querySelector(".resume-page")).toBeTruthy();
    expect(screen.getByText("Atelier Nord")).toBeInTheDocument();
    expect(screen.getByText("Website design")).toBeInTheDocument();
    expect(screen.getByText("$13,048.43")).toBeInTheDocument();
  });
  it("hides discount, PO and deposit rows when empty", () => {
    render(<SterlingPreview data={{ ...sampleInvoice, poNumber: "", discountValue: 0, taxes: [], amountPaid: 0 }} />);
    expect(screen.queryByText(sampleInvoice.discountLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(sampleInvoice.amountPaidLabel)).not.toBeInTheDocument();
  });
});
