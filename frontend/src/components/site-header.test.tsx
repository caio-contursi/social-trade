import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";

const auth = vi.hoisted(() => ({ user: null as null | { id: number }, pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => auth.pathname }));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));

describe("navegação do cabeçalho", () => {
  it("mostra o atalho de suporte ao lado de entrar e cadastro mesmo sem sessão", () => {
    auth.user = null;
    auth.pathname = "/";
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Suporte" })).toHaveAttribute(
      "href",
      "/entrar?proximo=%2Fpainel%2Fsuporte",
    );
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
    expect(screen.getByRole("link", { name: "Fazer cadastro" })).toHaveAttribute("href", "/cadastro");
  });

  it("mostra suporte ao lado das ações da conta e aponta para o painel", () => {
    auth.user = { id: 1 };
    auth.pathname = "/painel";
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Suporte" })).toHaveAttribute(
      "href",
      "/painel/suporte",
    );
  });

  it("mantém somente as três seções institucionais na página 1", () => {
    auth.user = null;
    auth.pathname = "/";
    render(<SiteHeader />);

    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(navigation.querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Quem somos" })).toHaveAttribute("href", "/#quem-somos");
    expect(screen.getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/#como-funciona");
    expect(screen.getByRole("link", { name: "Transparência" })).toHaveAttribute("href", "/#transparencia");
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer cadastro" })).toBeInTheDocument();
  });
});
