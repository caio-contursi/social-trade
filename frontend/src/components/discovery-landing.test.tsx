import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryLanding } from "./discovery-landing";

vi.mock("@/components/hero-carousel", () => ({
  HeroCarousel: () => <div aria-label="Imagens de projetos" />,
}));
vi.mock("@/components/project-explorer", () => ({
  ProjectExplorer: () => <div />,
  ProjectInvite: () => null,
}));
vi.mock("@/components/page-retry", () => ({ PageRetry: () => null }));
vi.mock("@/components/cause-quiz", () => ({ CauseQuiz: () => null }));

describe("apresentação inicial", () => {
  it("mantém o destaque principal, amplia o título e remove os textos auxiliares", () => {
    render(<DiscoveryLanding projects={[]} error={false} />);

    const title = screen.getByRole("heading", {
      name: "Apoiar uma causa. Transformar uma realidade.",
    });
    expect(title).toHaveClass("discovery-title");
    expect(screen.getByRole("button", { name: /Encontrar um projeto/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sou um projeto social" })).toBeInTheDocument();
    expect(screen.queryByText(/Aproximamos empresas, pessoas e projetos sociais/)).not.toBeInTheDocument();
    expect(screen.queryByText("Para quem quer apoiar")).not.toBeInTheDocument();
    expect(screen.queryByText("Para projetos sociais")).not.toBeInTheDocument();
  });
});
