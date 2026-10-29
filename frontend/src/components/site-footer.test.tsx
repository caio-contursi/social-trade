import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./site-footer";

vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ user: null }) }));

describe("links do rodapé", () => {
  it("aplica a transição de desfoco nas saídas para cadastro, sugestão e conta", () => {
    render(<SiteFooter />);
    for (const name of ["Cadastre sua empresa", "Apresente seu projeto", "Deixe uma sugestão!", "Acesse sua conta"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("data-route-transition");
    }
    expect(screen.getByRole("link", { name: "Encontre um projeto" })).toHaveAttribute("href", "/#projetos");
  });
});
