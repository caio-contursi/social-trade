import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/painel";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { RouteTransitionManager } from "./route-transition-manager";

function navigateTo(path: string, rerender: (ui: React.ReactElement) => void) {
  pathname = path;
  window.history.pushState({}, "", path);
  rerender(<RouteTransitionManager />);
}

describe("RouteTransitionManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = "/painel";
    window.history.pushState({}, "", "/painel");
  });
  afterEach(() => vi.useRealTimers());

  it("mantém o desfoco com carregamento por 1 segundo após a troca de tela", () => {
    const { rerender } = render(<><RouteTransitionManager /><a data-route-transition href="/" onClick={(event) => event.preventDefault()}>Explorar projetos</a></>);
    fireEvent.click(screen.getByRole("link", { name: "Explorar projetos" }));
    expect(screen.getByRole("status", { name: "Carregando próxima página" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    act(() => navigateTo("/", (ui) => rerender(<>{ui}<a data-route-transition href="/">Explorar projetos</a></>)));
    act(() => { vi.advanceTimersByTime(790); });
    expect(screen.getByRole("status", { name: "Carregando próxima página" })).not.toHaveClass("is-closing");
    act(() => { vi.advanceTimersByTime(10); });
    expect(screen.getByRole("status", { name: "Carregando próxima página" })).toHaveClass("is-closing");
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByRole("status", { name: "Carregando próxima página" })).not.toBeInTheDocument();
  });

  it("não aplica o efeito em links sem data-route-transition", () => {
    render(<><RouteTransitionManager /><a href="/" onClick={(event) => event.preventDefault()}>Sem efeito</a></>);
    fireEvent.click(screen.getByRole("link", { name: "Sem efeito" }));
    expect(screen.queryByRole("status", { name: "Carregando próxima página" })).not.toBeInTheDocument();
  });
});
