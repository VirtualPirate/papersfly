import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

describe("ThemeToggle (React)", () => {
  it("toggles the dark class on the document root when clicked", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
