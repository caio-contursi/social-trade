import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CauseQuiz } from "./cause-quiz";
import { causeQuizQuestions } from "@/lib/cause-quiz";

const foodChoices = [0, 3, 1, 0, 2, 1, 0, 1, 1, 1];

function answer(index: number, optionIndex: number) {
  fireEvent.click(screen.getByRole("button", { name: causeQuizQuestions[index].options[optionIndex].text }));
  fireEvent.click(screen.getByRole("button", { name: index === 9 ? "Ver meu resultado" : "Confirmar escolha" }));
}

describe("jornada do quiz de causas", () => {
  afterEach(() => vi.useRealTimers());

  it("permite refletir, trocar a seleção e rever a resposta antes de confirmar", async () => {
    vi.useFakeTimers();
    render(<CauseQuiz />);
    fireEvent.click(screen.getByRole("button", { name: /Começar quiz/ }));
    expect(screen.getByRole("button", { name: "Confirmar escolha" })).toBeDisabled();

    const firstOptions = causeQuizQuestions[0].options;
    fireEvent.click(screen.getByRole("button", { name: firstOptions[0].text }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByTestId("quiz-scenario")).toHaveTextContent("Dilema 01");
    fireEvent.click(screen.getByRole("button", { name: firstOptions[3].text }));
    expect(screen.getByRole("button", { name: firstOptions[0].text })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: firstOptions[3].text })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar escolha" }));
    expect(screen.getByTestId("quiz-scenario")).toHaveTextContent("Dilema 02");

    fireEvent.click(screen.getByRole("button", { name: "Voltar pergunta" }));
    expect(screen.getByRole("button", { name: firstOptions[3].text })).toHaveAttribute("aria-pressed", "true");
    answer(0, 2);
    fireEvent.click(screen.getByRole("button", { name: "Voltar pergunta" }));
    expect(screen.getByRole("button", { name: firstOptions[2].text })).toHaveAttribute("aria-pressed", "true");
  });

  it("combina os dez dilemas em um resultado explicado e permite recomeçar sem respostas antigas", () => {
    render(<CauseQuiz />);
    fireEvent.click(screen.getByRole("button", { name: /Começar quiz/ }));
    for (let index = 0; index < 10; index += 1) {
      expect(screen.getByTestId("quiz-scenario")).toHaveTextContent(`Dilema ${String(index + 1).padStart(2, "0")}`);
      answer(index, foodChoices[index]);
    }
    expect(screen.getByText("Sua causa em destaque")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alimentação" })).toBeInTheDocument();
    const guide = screen.getByTestId("cause-project-guide");
    expect(guide).toHaveTextContent("Que tipos de projeto se relacionam com alimentação?");
    expect(guide).toHaveTextContent("Cozinhas comunitárias e distribuição de refeições ou cestas básicas");
    expect(guide).toHaveTextContent("Hortas comunitárias, escolares ou urbanas");
    expect(guide).toHaveTextContent("Cada projeto pode atuar em mais de uma causa");
    expect(screen.getByRole("link", { name: /Explorar projetos de alimentação/ })).toHaveAttribute("href", "/?causa=food#projetos");
    fireEvent.click(screen.getByRole("button", { name: "Refazer quiz" }));
    expect(screen.getByRole("button", { name: /Começar quiz/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar quiz/ }));
    expect(screen.getByTestId("quiz-scenario")).toHaveTextContent("Dilema 01");
    expect(screen.getByRole("button", { name: "Confirmar escolha" })).toBeDisabled();
    expect(screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(0);
  });

  it("mostra todas as afinidades que empataram na liderança", () => {
    render(<CauseQuiz />);
    fireEvent.click(screen.getByRole("button", { name: /Começar quiz/ }));
    for (let index = 0; index < 10; index += 1) answer(index, 0);

    expect(screen.getByText("Uma das suas causas em destaque")).toBeInTheDocument();
    expect(screen.getByText("Afinidades no mesmo nível:").parentElement).toHaveTextContent("Alimentação, Saúde, Crianças e adolescentes");
  });
});
