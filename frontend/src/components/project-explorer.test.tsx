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
  },
];

describe("busca de projetos em tempo real", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
    navigation.replace.mockReset();
  });

  it("filtra enquanto digita sem exigir Enter ou botão de busca", async () => {
    const user = userEvent.setup();
    render(<ProjectExplorer projects={projects} />);

    expect(screen.getByText("2", { selector: "strong" })).toBeInTheDocument();
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
});
