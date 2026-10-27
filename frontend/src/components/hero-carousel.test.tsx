import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroCarousel } from "./hero-carousel";

describe("carrossel da apresentação", () => {
  afterEach(() => vi.useRealTimers());

  it("começa com a foto comunitária e alterna seis imagens a cada 3,5 segundos", () => {
    vi.useFakeTimers();
    render(<HeroCarousel />);

    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();
    expect(screen.getByText("Imagem 1 de 6")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3499));
    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("img", { name: "Maçãs vermelhas frescas" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5 * 3500));
    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();
    expect(screen.getByText("Imagem 1 de 6")).toBeInTheDocument();
  });

  it("permite trocar e voltar imagens pelos controles acessíveis", () => {
    render(<HeroCarousel />);
    fireEvent.click(screen.getByRole("button", { name: "Próxima imagem" }));
    expect(screen.getByRole("img", { name: "Maçãs vermelhas frescas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Imagem anterior" }));
    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();
  });
});
