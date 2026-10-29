import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroCarousel } from "./hero-carousel";

describe("carrossel da apresentação", () => {
  afterEach(() => vi.useRealTimers());

  it("começa com a foto comunitária e alterna seis imagens a cada 5 segundos", () => {
    vi.useFakeTimers();
    render(<HeroCarousel />);

    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();
    expect(screen.queryByText(/Imagem \d de/)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("img", { name: "Maçãs vermelhas frescas" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5 * 5000));
    expect(screen.getByRole("img", { name: "Pessoa voluntária durante uma atividade comunitária" })).toBeInTheDocument();
    expect(screen.queryByText(/Imagem \d de/)).not.toBeInTheDocument();
  });

  it("não oferece controles para trocar as imagens manualmente nem contador", () => {
    render(<HeroCarousel />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Selecionar imagem" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Imagem \d de/)).not.toBeInTheDocument();
  });
});
