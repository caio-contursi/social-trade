import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
import { WorkspaceShell } from "./shell";
import { SupportPage } from "./account";

vi.mock("next/navigation", () => ({
  usePathname: () => "/painel",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: "Pessoa de teste",
      account_type: "person",
      role: "member",
      role_label: "Membro",
    },
    loading: false,
    error: null,
    retrySession: vi.fn(),
    logout: vi.fn(),
  }),
}));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("./shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./shared")>();
  return {
    ...actual,
    useWorkspaceResource: (path: string) => ({
      data: path === "/api/announcements" ? [] : [],
      loading: false,
      error: null,
      reload: vi.fn(),
    }),
  };
});

describe("ícones de suporte no painel", () => {
  it("usa headset na navegação lateral de suporte", () => {
    render(<WorkspaceShell><div>Conteúdo</div></WorkspaceShell>);
    const link = screen.getByRole("link", { name: "Suporte" });
    expect(link).toHaveAttribute("href", "/painel/suporte");
    expect(link).toHaveAttribute("data-route-transition", "true");
    expect(link.querySelector("svg")).toHaveClass("lucide-headset");
  });

  it("usa headset no indicador de solicitações em aberto", () => {
    render(<Dashboard />);
    const link = screen.getByRole("link", { name: /Solicitações em aberto/ });
    expect(link).toHaveAttribute("href", "/painel/suporte");
    expect(link.querySelector("svg")).toHaveClass("lucide-headset");
    expect(screen.queryByText("Empresa cadastrada")).not.toBeInTheDocument();
    expect(screen.queryByText("Avisos da plataforma")).not.toBeInTheDocument();
  });

  it("usa headset nos formulários e estados vazios da central de suporte", () => {
    render(<SupportPage />);

    for (const heading of ["Novo ticket", "Seus tickets", "Nenhum ticket ainda"]) {
      const icon = screen.getByRole("heading", { name: heading }).parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-headset");
    }
  });
});
