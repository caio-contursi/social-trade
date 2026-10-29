import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "./shell";

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown>, pathname: "/painel/suporte" }));
const notices = [{ id: 1 }, { id: 2 }, { id: 3 }];
vi.mock("@/components/auth-provider", () => ({ useAuth: () => ({ user: auth.user, loading: false, error: null, retrySession: vi.fn(), logout: vi.fn() }) }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => <button type="button">Tema</button> }));
vi.mock("next/navigation", () => ({ usePathname: () => auth.pathname, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("./shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./shared")>();
  return { ...actual, useWorkspaceResource: () => ({ data: notices, loading: false, error: null, reload: vi.fn() }) };
});

describe("navegação do painel", () => {
  beforeEach(() => {
    localStorage.clear();
    auth.pathname = "/painel/suporte";
    auth.user = {
      id: 1, full_name: "Projeto Social", account_type: "project", role: "member", role_label: "Membro",
      document: "90000001000129", username: "projeto", email: "projeto@example.test", phone: null,
      responsible_title: null, registration_number: null,
    };
  });

  it("remove a caixa promocional da navegação mantendo o botão de sair", () => {
    render(<WorkspaceShell><p>Conteúdo do painel</p></WorkspaceShell>);

    expect(screen.getByText("Conteúdo do painel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar projetos" })).toHaveAttribute("data-route-transition", "true");
    expect(screen.queryByText("Conexões que fazem a diferença.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair da conta" })).toBeInTheDocument();
  });

  it("mostra avisos não lidos e os marca como lidos ao abrir a página de avisos", async () => {
    const { rerender } = render(<WorkspaceShell><p>Conteúdo do painel</p></WorkspaceShell>);
    expect(await screen.findByLabelText("3 avisos não lidos")).toHaveTextContent("3");

    auth.pathname = "/painel/avisos";
    rerender(<WorkspaceShell><p>Conteúdo do painel</p></WorkspaceShell>);

    expect(await screen.findByRole("link", { name: "Avisos" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/aviso[s]? não lido[s]?/)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("socialtrade-read-announcements-1") || "[]")).toEqual([1, 2, 3]);
  });
});
