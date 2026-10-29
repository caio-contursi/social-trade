import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";

const theme = vi.hoisted(() => ({ resolvedTheme: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => theme }));

describe("chave de tema", () => {
  it("ativa o escuro e mostra sol e lua", () => {
    theme.resolvedTheme = "light";
    render(<ThemeToggle />);
    const toggle = screen.getByRole("switch", { name: "Tema escuro" });
    expect(toggle).not.toBeChecked();
    expect(toggle.querySelector(".lucide-sun")).toBeInTheDocument();
    expect(toggle.querySelector(".lucide-moon")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle-thumb")).toHaveClass("transition-transform", "duration-300", "translate-x-0");
    fireEvent.click(toggle);
    expect(theme.setTheme).toHaveBeenCalledWith("dark");
  });
  it("usa o tema resolvido e permite voltar ao claro pelo teclado", async () => {
    theme.resolvedTheme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const toggle = screen.getByRole("switch", { name: "Tema escuro" });
    expect(toggle).toBeChecked();
    expect(screen.getByTestId("theme-toggle-thumb")).toHaveClass("translate-x-8");
    toggle.focus();
    await user.keyboard(" ");
    expect(theme.setTheme).toHaveBeenCalledWith("light");
  });
});
