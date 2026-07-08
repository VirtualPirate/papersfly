import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariantPicker } from "./VariantPicker";
import {
  COLOR_SCHEMES, FONT_PAIRINGS, SPACING_PRESETS, SIZE_PRESETS, DEFAULT_VARIANT,
} from "@/theme/variants";

function renderPicker(onChange = vi.fn()) {
  render(
    <VariantPicker
      colors={COLOR_SCHEMES}
      fonts={FONT_PAIRINGS}
      spacings={SPACING_PRESETS}
      sizes={SIZE_PRESETS}
      value={DEFAULT_VARIANT}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("VariantPicker", () => {
  it("renders a swatch per color and a specimen per font pairing", () => {
    renderPicker();
    for (const name of ["Navy", "Charcoal", "Burgundy", "Forest"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    for (const name of ["Classic", "Editorial", "Modern", "Mono"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("marks the active color and font as pressed", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: "Navy" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Burgundy" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Classic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("emits a new variant with only the changed axis replaced", () => {
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Burgundy" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "burgundy", fontId: "classic" });
    fireEvent.click(screen.getByRole("button", { name: "Editorial" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "navy", fontId: "editorial" });
  });

  it("renders a button per spacing preset with Default active by default", () => {
    renderPicker();
    for (const name of ["Compact", "Default", "Relaxed"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Relaxed" })).toHaveAttribute("aria-pressed", "false");
  });

  it("emits a new variant with only spacingId replaced", () => {
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Relaxed" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "navy", fontId: "classic", spacingId: "relaxed" });
  });

  it("renders a button per size preset with Medium active by default", () => {
    renderPicker();
    for (const name of ["Small", "Medium", "Large"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Medium" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute("aria-pressed", "false");
  });

  it("emits a new variant with only sizeId replaced", () => {
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    expect(onChange).toHaveBeenLastCalledWith({ colorId: "navy", fontId: "classic", sizeId: "large" });
  });
});
