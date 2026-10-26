import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";

const auth = vi.hoisted(() => ({ user: null as null | { id: number } }));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));

describe("navegação do cabeçalho", () => {
  it("oculta o atalho de suporte quando não há sessão", () => {
    auth.user = null;
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "Suporte" })).not.toBeInTheDocument();
  });

  it("mostra suporte ao lado das ações da conta e aponta para o painel", () => {
    auth.user = { id: 1 };
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Suporte" })).toHaveAttribute(
      "href",
      "/painel/suporte",
    );
  });

  it("leva para a seção de projetos na página inicial", () => {
    auth.user = null;
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Explorar projetos" })).toHaveAttribute(
      "href",
      "/#projetos",
    );
  });
});
