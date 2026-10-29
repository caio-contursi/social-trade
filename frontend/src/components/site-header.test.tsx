import { act, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByRole("link", { name: "Suporte" }).querySelector("svg")).toHaveClass("lucide-headset");
    expect(screen.getByRole("link", { name: "Suporte" })).toHaveAttribute("data-route-transition");
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("data-route-transition");
    expect(screen.getByRole("link", { name: "Fazer cadastro" })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: "Fazer cadastro" })).toHaveAttribute("data-route-transition");
  });

  it("mostra suporte ao lado das ações da conta e aponta para o painel", () => {
    auth.user = { id: 1 };
    auth.pathname = "/painel";
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Suporte" })).toHaveAttribute(
      "href",
      "/painel/suporte",
    );
    expect(screen.getByRole("link", { name: "Suporte" })).toHaveAttribute("data-route-transition");
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(navigation).getByRole("link", { name: "Procurar projeto/instituição" })).toHaveAttribute(
      "href",
      "/?explorar=projetos",
    );
    expect(screen.queryByRole("link", { name: "Explorar projetos" })).not.toBeInTheDocument();
  });

  it("exibe as três seções institucionais sem o quiz na página inicial", () => {
    auth.user = null;
    auth.pathname = "/";
    render(<SiteHeader />);

    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(navigation.querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Quem somos" })).toHaveAttribute("href", "/#quem-somos");
    expect(screen.getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/#como-funciona");
    expect(screen.getByRole("link", { name: "Transparência" })).toHaveAttribute("href", "/#transparencia");
    expect(screen.queryByRole("link", { name: /quiz de causas|Encontre sua causa/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer cadastro" })).toBeInTheDocument();
  });

  it("liga o menu de descoberta aos três destinos sem selo de em breve", () => {
    auth.user = null;
    auth.pathname = "/";
    render(<SiteHeader />);

    act(() => {
      window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: true }));
    });

    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(navigation).getByRole("link", { name: "Procurar projeto/instituição" })).toHaveAttribute("href", "#projetos");
    expect(within(navigation).getByRole("link", { name: "Meu projeto" })).toHaveAttribute("href", "#meu-projeto");
    const causeFinder = within(navigation).getByRole("link", { name: "Encontre sua causa" });
    expect(causeFinder).toHaveAttribute("href", "#encontre-sua-causa");
    expect(causeFinder).not.toHaveTextContent("Em breve");
  });
  it("mantém o quiz apenas no menu lateral da página 2 em telas menores", () => {
    auth.user = null;
    auth.pathname = "/";
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel" });
    expect(within(mobile).queryByRole("link", { name: /quiz de causas|Encontre sua causa/ })).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: true })));
    expect(within(mobile).getByRole("link", { name: "Procurar projeto/instituição" })).toHaveAttribute("href", "#projetos");
    expect(within(mobile).getByRole("link", { name: "Meu projeto" })).toHaveAttribute("href", "#meu-projeto");
    expect(within(mobile).getByRole("link", { name: "Encontre sua causa" }))
      .toHaveAttribute("href", "#encontre-sua-causa");
    expect(within(mobile).getByRole("link", { name: "Encontre sua causa" }))
      .toHaveClass("hover:bg-accent", "transition-colors");
    expect(screen.queryByRole("navigation", { name: "Navegação de projetos" })).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: false })));
    expect(within(mobile).queryByRole("link", { name: "Encontre sua causa" })).not.toBeInTheDocument();
  });

});
