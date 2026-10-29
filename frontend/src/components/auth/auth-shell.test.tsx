import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthShell } from "./auth-shell";

describe("retorno das páginas de acesso", () => {
  it.each([false, true])("aplica a transição aos atalhos do início e de projetos (cadastro: %s)", (registration) => {
    render(<AuthShell registration={registration}>Formulário</AuthShell>);
    for (const link of screen.getAllByRole("link").filter((link) => ["/", "/?explorar=projetos#projetos"].includes(link.getAttribute("href") || ""))) {
      expect(link).toHaveAttribute("data-route-transition");
    }
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("data-route-transition");
  });
});
