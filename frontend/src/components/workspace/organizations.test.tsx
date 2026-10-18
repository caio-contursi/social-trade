import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Catalog, Organization } from "@/lib/types";
import { OrganizationEditor } from "./organizations";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/painel/organizacoes",
}));
vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({ token: "token-de-teste", expireSession: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const catalog: Catalog = {
  areas: [
    { code: "food", label: "Alimentação" },
    { code: "education", label: "Educação" },
  ],
  organization_types: [
    { code: "independent_project", label: "Projeto independente" },
  ],
  services: [
    { code: "public_profile", label: "Página pública", status: "available" },
    { code: "campaigns", label: "Campanhas", status: "coming_soon" },
    { code: "volunteers", label: "Voluntários", status: "future" },
  ],
  roles: {},
  demo_users_enabled: false,
};

function organization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 7,
    name: "Projeto Horta Viva",
    slug: "projeto-horta-viva",
    organization_type: "independent_project",
    institution_kind: "project",
    city: "Niterói",
    state: "RJ",
    founding_year: null,
    short_description: "Hortas comunitárias em escolas públicas.",
    objective: "Levar hortas a dez escolas da cidade.",
    impact_summary: "Três hortas montadas com estudantes.",
    description: null,
    website_url: null,
    instagram_url: null,
    logo_url: null,
    created_at: "2026-10-17T12:00:00Z",
    areas: ["food"],
    cnpj: null,
    pix_key: null,
    services: [],
    ...overrides,
  };
}

describe("editor de organização", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    // O jsdom não tem ResizeObserver, usado pelos checkboxes do Radix.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  function renderEditor(value: Organization) {
    render(
      <OrganizationEditor
        organization={value}
        catalog={catalog}
        open
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
  }

  it("sem Estado, marca o campo, mostra o erro nele e leva o foco até ele", async () => {
    const user = userEvent.setup();
    renderEditor(organization({ state: "" }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    const state = screen.getByRole("combobox", { name: /Estado/ });
    await waitFor(() => expect(state).toHaveFocus());
    expect(state).toHaveAttribute("aria-invalid", "true");
    expect(state).toHaveAccessibleDescription(
      "Selecione o estado da organização.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecione o estado da organização.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sem áreas, descreve o grupo, marca as opções e foca a primeira", async () => {
    const user = userEvent.setup();
    renderEditor(organization({ areas: [] }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    const first = screen.getByRole("checkbox", { name: "Alimentação" });
    await waitFor(() => expect(first).toHaveFocus());
    expect(first).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("group", { name: /Áreas de atuação/ }),
    ).toHaveAccessibleDescription(
      "Selecione ao menos uma área de atuação para o projeto.",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(first);
    expect(first).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /Áreas de atuação/ }),
    ).not.toHaveAccessibleDescription();
  });

  it("mostra os três estados dos recursos de interesse", () => {
    renderEditor(organization());
    expect(screen.getByText("Disponível")).toBeInTheDocument();
    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(screen.getByText("Planejado, sem previsão")).toBeInTheDocument();
  });
});
