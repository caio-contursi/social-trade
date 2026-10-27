import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";
import { ProjectAdminPage } from "./project-admin";

let account: User | null;

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ user: account }) }));

describe("administração superficial do projeto", () => {
  beforeEach(() => {
    account = {
      id: 7,
      full_name: "Projeto Horta Viva",
      username: "horta-viva",
      email: "horta@example.test",
      document: "00000000000000",
      account_type: "project",
      role: "member",
      role_label: "Projeto",
      phone: null,
      responsible_title: null,
      registration_number: null,
    };
  });

  it("apresenta os módulos previstos como em breve sem sugerir ações ativas", () => {
    render(<ProjectAdminPage />);

    expect(screen.getByRole("heading", { name: "Meu projeto." })).toBeVisible();
    expect(screen.getByText("Área em construção")).toBeVisible();
    for (const title of [
      "Investimentos do projeto",
      "Equipe e prestadores",
      "Presença",
      "Benefícios e elegibilidade",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    expect(screen.getAllByText("Em breve", { selector: "span" })).toHaveLength(4);
    expect(screen.getByText(/ainda não registram nem movimentam dados ou pagamentos/)).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Editar perfil/ })[0]).toHaveAttribute("href", "/painel/organizacoes");
  });

  it("não mostra ferramentas administrativas para contas que não sejam projetos", () => {
    account = { ...account!, account_type: "person" };
    render(<ProjectAdminPage />);

    expect(screen.getByRole("heading", { name: "Área de projetos" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Investimentos do projeto" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar à visão geral" })).toHaveAttribute("href", "/painel");
  });
});
