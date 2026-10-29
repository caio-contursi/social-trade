import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenProjectsLink } from "./open-projects-link";

describe("atalho para projetos", () => {
  afterEach(() => { delete document.documentElement.dataset.exploringProjects; });
  it("rola progressivamente até os projetos quando a página 2 já está aberta", () => {
    document.documentElement.dataset.exploringProjects = "true";
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const frames = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<><section id="projetos" /><OpenProjectsLink>Encontre um projeto</OpenProjectsLink></>);
    vi.spyOn(document.getElementById("projetos")!, "getBoundingClientRect").mockReturnValue({ top: -500 } as DOMRect);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1000 });
    fireEvent.click(screen.getByRole("link", { name: "Encontre um projeto" }));
    expect(frames).toHaveBeenCalledOnce();
    expect(scroll).not.toHaveBeenCalled();
  });
  it("abre a descoberta no topo quando sai da página 1", () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const opened = vi.fn();
    window.addEventListener("socialtrade:open-projects", opened);
    render(<OpenProjectsLink>Encontre um projeto</OpenProjectsLink>);
    fireEvent.click(screen.getByRole("link", { name: "Encontre um projeto" }));
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
    expect(opened).toHaveBeenCalledOnce();
    window.removeEventListener("socialtrade:open-projects", opened);
  });

  it("atualiza o filtro do catálogo ao abrir projetos de uma causa do quiz", () => {
    render(<OpenProjectsLink cause="food">Explorar projetos de alimentação</OpenProjectsLink>);

    expect(screen.getByRole("link", { name: "Explorar projetos de alimentação" })).toHaveAttribute(
      "href",
      "/?causa=food#projetos",
    );
  });
});
