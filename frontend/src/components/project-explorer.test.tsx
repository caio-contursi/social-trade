import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectExplorer } from "./project-explorer";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => "/projetos",
  useSearchParams: () => navigation.params,
}));

const projects = [
  {
    name: "Instituto Cenu",
    slug: "instituto-cenu",
    organization_type: "Associação",
    city: "Rio de Janeiro",
    state: "RJ",
    founding_year: 2010,
    short_description: "Apoio à educação de crianças.",
    objective: "Ampliar acesso à educação",
    impact_summary: null,
    description: null,
    website_url: null,
    instagram_url: null,
    logo_url: null,
    created_at: "2026-01-01T00:00:00Z",
    areas: ["education"],
    pix_donations_available: true,
    sol_donations_available: false,
    profile_completeness: 92,
  },
  {
    name: "Projeto Saúde Viva",
    slug: "projeto-saude-viva",
    organization_type: "Associação",
    city: "Niterói",
    state: "RJ",
    founding_year: 2015,
    short_description: "Atendimento de saúde comunitária.",
    objective: "Cuidado e prevenção",
    impact_summary: null,
    description: null,
    website_url: null,
    instagram_url: null,
    logo_url: null,
    created_at: "2026-01-02T00:00:00Z",
    areas: ["health"],
    pix_donations_available: false,
    sol_donations_available: true,
    profile_completeness: 65,
  },
  {
    name: "Projeto Apoio Integrado",
    slug: "projeto-apoio-integrado",
    organization_type: "Associação",
    city: "São Gonçalo",
    state: "RJ",
    founding_year: 2018,
    short_description: "Atuação integrada com a comunidade.",
    objective: "Fortalecer a rede comunitária",
    impact_summary: null,
    description: null,
    website_url: null,
    instagram_url: null,
    logo_url: null,
    created_at: "2026-01-03T00:00:00Z",
    areas: ["education"],
    pix_donations_available: true,
    sol_donations_available: true,
    profile_completeness: 70,
  },
];

describe("busca de projetos em tempo real", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
    navigation.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([
      { id: 1, nome: "Niterói" },
      { id: 2, nome: "Rio de Janeiro" },
      { id: 3, nome: "São Gonçalo" },
    ])));
  });

  it("filtra enquanto digita sem exigir Enter ou botão de busca", async () => {
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} />);

    expect(screen.getByText("3", { selector: "strong" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Buscar projetos/), "cenu");

    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer Instituto Cenu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Projeto Saúde Viva/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buscar projetos" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(
        "/projetos?busca=cenu",
        { scroll: false },
      ),
    );
  });

  it("permite pesquisar e escolher uma causa sem acentos", async () => {
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} />);

    await user.click(screen.getByRole("combobox", { name: "Causa" }));
    await user.type(screen.getByRole("combobox", { name: "Causa" }), "saud");
    await user.click(screen.getByRole("option", { name: "Saúde" }));

    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer Projeto Saúde Viva" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Conhecer Instituto Cenu" })).not.toBeInTheDocument();
    expect(navigation.replace).toHaveBeenCalledWith("/projetos?causa=health", { scroll: false });
  });

  it("pesquisa estados por nome e cidades da UF selecionada", async () => {
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} />);

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.type(screen.getByRole("combobox", { name: "Estado" }), "rio de janeiro");
    await user.click(screen.getByRole("option", { name: "Rio de Janeiro (RJ)" }));

    const cityCombobox = screen.getByRole("combobox", { name: "Cidade" });
    await user.click(cityCombobox);
    await user.type(cityCombobox, "niter");
    await user.click(await screen.findByRole("option", { name: "Niterói" }));

    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer Projeto Saúde Viva" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("https://servicodados.ibge.gov.br/api/v1/localidades/estados/RJ/municipios");
    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/projetos?estado=RJ&cidade=Niter%C3%B3i",
      { scroll: false },
    );
  });

  it("usa apenas cidades de projetos da UF se a consulta de localidades falhar", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("IBGE indisponível"));
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} />);

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    await user.type(screen.getByRole("combobox", { name: "Estado" }), "RJ");
    await user.click(screen.getByRole("option", { name: "Rio de Janeiro (RJ)" }));

    expect(await screen.findByText(/não foi possível carregar todas as cidades/i)).toBeVisible();
    await user.click(screen.getByRole("combobox", { name: "Cidade" }));
    await user.type(screen.getByRole("combobox", { name: "Cidade" }), "rio");
    expect(screen.getByRole("option", { name: "Rio de Janeiro" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Niterói" })).not.toBeInTheDocument();
  });

  it("ordena nomes A-Z, Z-A e em alta sem expor pontuação interna", async () => {
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} showInvite={false} />);
    const order = screen.getByRole("combobox", { name: "Ordenar por" });

    await user.click(order);
    await user.click(screen.getByRole("option", { name: "Nome, de A a Z" }));
    expect(screen.getAllByRole("link", { name: /^Conhecer/ }).map((link) => link.getAttribute("href")))
      .toEqual([
        "/projetos/instituto-cenu#conteudo",
        "/projetos/projeto-apoio-integrado#conteudo",
        "/projetos/projeto-saude-viva#conteudo",
      ]);

    await user.click(order);
    await user.click(screen.getByRole("option", { name: "Nome, de Z a A" }));
    expect(screen.getAllByRole("link", { name: /^Conhecer/ }).map((link) => link.getAttribute("href")))
      .toEqual([
        "/projetos/projeto-saude-viva#conteudo",
        "/projetos/projeto-apoio-integrado#conteudo",
        "/projetos/instituto-cenu#conteudo",
      ]);

    await user.click(order);
    await user.click(screen.getByRole("option", { name: "Projetos em alta" }));
    expect(screen.getAllByRole("link", { name: /^Conhecer/ }).map((link) => link.getAttribute("href")))
      .toEqual([
        "/projetos/instituto-cenu#conteudo",
        "/projetos/projeto-apoio-integrado#conteudo",
        "/projetos/projeto-saude-viva#conteudo",
      ]);
    expect(screen.queryByText(/estrelas|avaliação interna|pontuação/i)).not.toBeInTheDocument();
  });

  it("filtra projetos conforme o Pix, SOL ou disponibilidade dos dois", async () => {
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} showInvite={false} />);
    const order = screen.getByRole("combobox", { name: "Ordenar por" });

    await user.click(order);
    await user.click(screen.getByRole("option", { name: "Apenas Pix" }));
    expect(screen.getByRole("link", { name: "Conhecer Instituto Cenu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Conhecer Projeto Saúde Viva" })).not.toBeInTheDocument();

    await user.click(order);
    await user.click(screen.getByRole("option", { name: "Apenas SOL" }));
    expect(screen.getByRole("link", { name: "Conhecer Projeto Saúde Viva" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Conhecer Instituto Cenu" })).not.toBeInTheDocument();

    await user.click(order);
    await user.click(screen.getByRole("option", { name: "Pix e SOL" }));
    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer Projeto Apoio Integrado" })).toBeInTheDocument();
    expect(navigation.replace).toHaveBeenLastCalledWith("/projetos?ordem=ambos", { scroll: false });
  });

  it("mostra um convite amplo para apresentar o projeto logo após os resultados", () => {
    render(<ProjectExplorer projects={projects} />);

    const invite = screen.getByRole("region", { name: "Cadastre seu projeto" });
    expect(invite).toBeVisible();
    expect(screen.getByRole("link", { name: /Apresentar meu projeto/ })).toHaveAttribute(
      "href",
      "/cadastro?tipo=project",
    );
  });
});
