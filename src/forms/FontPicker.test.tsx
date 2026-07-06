import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FontPicker } from "./FontPicker";

describe("FontPicker", () => {
  it("labels the trigger as default when no value", () => {
    render(<FontPicker value={null} onChange={() => {}} label="Full name" />);
    expect(
      screen.getByRole("button", { name: /font for full name: default/i }),
    ).toBeInTheDocument();
  });

  it("reflects the active font and marks the trigger active", () => {
    render(<FontPicker value="lora" onChange={() => {}} label="Full name" />);
    const btn = screen.getByRole("button", { name: /font for full name: lora/i });
    expect(btn).toHaveAttribute("data-active", "true");
  });

  it("lists Default plus every library font when opened", () => {
    render(<FontPicker value={null} onChange={() => {}} label="Headline" />);
    fireEvent.keyDown(screen.getByRole("button", { name: /font for headline/i }), {
      key: "Enter",
    });
    expect(screen.getByRole("menuitem", { name: /default/i })).toBeInTheDocument();
    for (const name of ["Inter", "Source Serif", "Lora", "Playfair Display", "IBM Plex Sans", "IBM Plex Mono"]) {
      expect(screen.getByRole("menuitem", { name })).toBeInTheDocument();
    }
  });

  it("emits the chosen font id and null for Default", () => {
    const onChange = vi.fn();
    render(<FontPicker value="lora" onChange={onChange} label="Headline" />);
    const open = () =>
      fireEvent.keyDown(screen.getByRole("button", { name: /font for headline/i }), { key: "Enter" });

    open();
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Playfair Display" }), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("playfair");

    open();
    fireEvent.keyDown(screen.getByRole("menuitem", { name: /default/i }), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
