import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Catalog, Organization } from "@/lib/types";
import { OrganizationEditor } from "./organizations";
import { jsonResponse } from "@/test/helpers";

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
    fetchMock.mockImplementation((input) => {
      if (String(input) === "/api/projects/open") {
        return Promise.resolve(jsonResponse([
          organization(),
          organization({ id: 9, name: "Instituto Cenu", city: "Rio de Janeiro" }),
          organization({ id: 10, city: "São Paulo", state: "SP" }),
        ]));
      }
      return Promise.resolve(jsonResponse(organization()));
    });
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
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { configurable: true, value: () => false },
      setPointerCapture: { configurable: true, value: () => {} },
      releasePointerCapture: { configurable: true, value: () => {} },
      scrollIntoView: { configurable: true, value: () => {} },
    });
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

  it("destaca todos os textos obrigatórios vazios e impede o salvamento", async () => {
    const user = userEvent.setup();
    renderEditor(organization({ name: "", short_description: "", objective: "", impact_summary: "" }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(screen.getByLabelText(/Nome do projeto/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Apresentação em poucas palavras/)).toHaveAccessibleDescription(/Preencha o campo/);
    expect(screen.getByLabelText(/Objetivos do projeto/)).toHaveAccessibleDescription(/Preencha o campo/);
    expect(screen.getByLabelText(/Resultados e impacto relatados/)).toHaveAccessibleDescription(/Preencha o campo/);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH" || init?.method === "POST")).toBe(false);
  });

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
    expect(fetchMock.mock.calls.some(([path]) => String(path) === "/api/organizations/7")).toBe(false);
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
    expect(fetchMock.mock.calls.some(([path]) => String(path) === "/api/organizations/7")).toBe(false);

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

  it("remove números do nome, restringe o ano e oferece apenas cidades cadastradas no estado", async () => {
    const user = userEvent.setup();
    renderEditor(organization());

    const name = screen.getByLabelText(/Nome do projeto/);
    await user.type(name, " 2026");
    expect(name).toHaveValue("Projeto Horta Viva ");
    const year = screen.getByLabelText("Ano de fundação");
    await user.type(year, "20a26");
    expect(year).toHaveValue("2026");

    const city = screen.getByRole("combobox", { name: /Cidade/ });
    await user.click(city);
    expect(screen.getByRole("option", { name: "Niterói" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rio de Janeiro" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "São Paulo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Rio de Janeiro" }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => String(path) === "/api/organizations/7")).toBe(true));
    const save = fetchMock.mock.calls.find(([path]) => String(path) === "/api/organizations/7");
    const payload = JSON.parse(save?.[1]?.body as string);
    expect(payload.name).toBe("Projeto Horta Viva");
    expect(payload.founding_year).toBe(2026);
    expect(payload.city).toBe("Rio de Janeiro");
    expect(payload.state).toBe("RJ");
  });

  it("preserva o CNPJ alfanumérico salvo e o normaliza no envio da edição", async () => {
    const user = userEvent.setup();
    renderEditor(organization({ cnpj: "12.abc.345/01de-35" }));
    const cnpj = screen.getByLabelText(/CNPJ/);
    expect(cnpj).toHaveAttribute("inputmode", "text");
    expect(cnpj).toHaveAttribute("readonly");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => String(path) === "/api/organizations/7")).toBe(true));
    const save = fetchMock.mock.calls.find(([path]) => String(path) === "/api/organizations/7");
    expect(JSON.parse(save?.[1]?.body as string).cnpj).toBe("12ABC34501DE35");
  });

  it("rejeita CNPJ alfanumérico com DV incorreto e foca o campo", async () => {
    const user = userEvent.setup();
    renderEditor(organization({ cnpj: "12ABC34501DE34" }));
    const cnpj = screen.getByLabelText(/CNPJ/);
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(cnpj).toHaveFocus());
    expect(cnpj).toHaveAccessibleDescription("Informe um CNPJ válido, numérico ou alfanumérico.");
    expect(fetchMock.mock.calls.some(([path]) => String(path) === "/api/organizations/7")).toBe(false);
  });

  it("mantém CNPJ institucional já salvo somente para leitura", () => {
    renderEditor(organization({ cnpj: "12ABC34501DE35" }));
    expect(screen.getByLabelText(/CNPJ/)).toHaveAttribute("readonly");
  });

  it("não altera a identidade de perfil legado sem CNPJ", () => {
    renderEditor(organization({ cnpj: null }));
    expect(screen.getByLabelText(/CNPJ/)).toHaveAttribute("readonly");
    expect(screen.getByLabelText(/CNPJ/)).toHaveValue("");
  });
});
