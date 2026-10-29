import { describe, expect, it } from "vitest";
import { causeProjectGuides, causeQuizQuestions, quizCauseCodes, scoreCauseQuiz, type CauseQuizAnswer, type QuizCauseCode } from "./cause-quiz";
import { areaLabels, projectFilterCauseCodes } from "./catalog";

function answersFor(optionIndex: number): CauseQuizAnswer[] {
  return causeQuizQuestions.map((question) => ({ questionId: question.id, optionId: question.options[optionIndex % question.options.length].id }));
}

const strictResultCases: {
  cause: QuizCauseCode;
  secondary: QuizCauseCode;
  choices: number[];
  scores: number[];
}[] = [
  { cause: "food", secondary: "health", choices: [0, 3, 1, 0, 2, 1, 0, 1, 1, 1], scores: [20, 4, 6, 6, 0, 4, 5, 0, 4, 1] },
  { cause: "education", secondary: "food", choices: [1, 0, 3, 1, 1, 2, 3, 1, 1, 1], scores: [5, 17, 5, 4, 0, 5, 5, 5, 1, 3] },
  { cause: "health", secondary: "food", choices: [1, 2, 0, 3, 0, 0, 2, 1, 0, 1], scores: [5, 0, 19, 5, 5, 5, 1, 5, 5, 0] },
  { cause: "housing", secondary: "food", choices: [1, 3, 0, 0, 3, 0, 0, 2, 2, 0], scores: [6, 0, 4, 19, 4, 4, 5, 0, 3, 5] },
  { cause: "children", secondary: "food", choices: [0, 1, 2, 0, 0, 3, 0, 0, 2, 0], scores: [6, 0, 2, 5, 18, 0, 4, 6, 5, 4] },
  { cause: "animals", secondary: "food", choices: [3, 0, 1, 0, 2, 0, 3, 0, 0, 2], scores: [5, 5, 0, 5, 2, 16, 4, 5, 4, 4] },
  { cause: "environment", secondary: "food", choices: [2, 3, 0, 1, 0, 2, 0, 3, 0, 0], scores: [5, 4, 5, 2, 5, 3, 16, 0, 5, 5] },
  { cause: "sports", secondary: "health", choices: [1, 2, 1, 3, 1, 3, 0, 0, 3, 0], scores: [1, 1, 5, 4, 5, 4, 5, 18, 3, 4] },
  { cause: "culture", secondary: "food", choices: [1, 0, 2, 1, 2, 1, 1, 0, 0, 3], scores: [5, 5, 0, 5, 4, 1, 4, 5, 17, 4] },
  { cause: "technology", secondary: "health", choices: [3, 1, 0, 2, 3, 0, 1, 1, 0, 0], scores: [4, 3, 5, 5, 5, 4, 1, 1, 5, 17] },
];

describe("quiz de descoberta de causas", () => {
  it("contém 10 perguntas e usa exatamente as causas disponíveis no filtro de projetos", () => {
    expect(causeQuizQuestions).toHaveLength(10);
    expect(causeQuizQuestions.every((question) => question.options.length === 4)).toBe(true);
    expect(new Set(causeQuizQuestions.map((question) => question.id)).size).toBe(10);
    expect(quizCauseCodes).toEqual(projectFilterCauseCodes);
    expect(quizCauseCodes.every((cause) => Object.hasOwn(areaLabels, cause))).toBe(true);
    expect(quizCauseCodes).not.toContain("homelessness");
    expect(quizCauseCodes).not.toContain("emergency_relief");
    for (const question of causeQuizQuestions) {
      expect(new Set(question.options.map((option) => option.id)).size).toBe(4);
      for (const option of question.options) {
        expect(Object.keys(option.scores).length).toBeGreaterThan(0);
        expect(Object.keys(option.scores).every((cause) => quizCauseCodes.includes(cause as QuizCauseCode))).toBe(true);
      }
    }
  });

  it("equilibra o peso das opções e a exposição das dez causas nas quatro posições", () => {
    const exposure = Object.fromEntries(quizCauseCodes.map((cause) => [cause, 0]));
    const strongPositions = Object.fromEntries(quizCauseCodes.map((cause) => [cause, [0, 0, 0, 0]]));

    for (const question of causeQuizQuestions) {
      question.options.forEach((option, position) => {
        expect(Object.values(option.scores).sort((a, b) => a - b)).toEqual([1, 4]);
        expect(Object.values(option.scores).reduce((sum, points) => sum + points, 0)).toBe(5);
        for (const cause of quizCauseCodes) {
          exposure[cause] += option.scores[cause] ?? 0;
          if (option.scores[cause] === 4) strongPositions[cause][position] += 1;
        }
      });
    }

    for (const cause of quizCauseCodes) {
      expect(exposure[cause], cause).toBe(20);
      expect(strongPositions[cause], cause).toEqual([1, 1, 1, 1]);
    }
  });

  it("explica tipos de projetos para cada causa que pode aparecer como resultado", () => {
    expect(Object.keys(causeProjectGuides).sort()).toEqual([...quizCauseCodes].sort());
    for (const guide of Object.values(causeProjectGuides)) {
      expect(guide.summary.length).toBeGreaterThan(50);
      expect(guide.projectTypes.length).toBeGreaterThanOrEqual(3);
      expect(guide.projectTypes.every((projectType) => projectType.length > 20)).toBe(true);
    }
  });

  it("calcula uma recomendação, uma alternativa e proporções somando 100%", () => {
    const result = scoreCauseQuiz(answersFor(0));
    expect(result).not.toBeNull();
    expect(result?.primary).toBe("food");
    expect(result?.secondary).not.toBeNull();
    expect(quizCauseCodes).toContain(result!.primary);
    expect(quizCauseCodes).toContain(result!.secondary!);
    expect(Object.values(result!.percentages).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(result?.confidence).toBeGreaterThan(0);
  });

  it.each(strictResultCases)("recomenda $cause sem empate e calcula ranking e percentuais do percurso", ({ cause, secondary, choices, scores }) => {
    const answers = causeQuizQuestions.map((question, index) => ({ questionId: question.id, optionId: question.options[choices[index]].id }));
    const result = scoreCauseQuiz(answers);
    expect(result).not.toBeNull();
    if (!result) throw new Error(`O percurso de ${cause} deveria ser válido`);

    const expectedScores = Object.fromEntries(quizCauseCodes.map((code, index) => [code, scores[index]]));
    const expectedPercentages = Object.fromEntries(quizCauseCodes.map((code, index) => [code, scores[index] * 2]));
    expect(result.primary).toBe(cause);
    expect(result.secondary).toBe(secondary);
    expect(result.scores).toEqual(expectedScores);
    expect(result.percentages).toEqual(expectedPercentages);
    expect(result.confidence).toBe(expectedPercentages[cause]);
    expect(Object.values(result.percentages).reduce((sum, value) => sum + value, 0)).toBe(100);
    for (const other of quizCauseCodes.filter((code) => code !== cause)) {
      expect(result.scores[cause], `${cause} deve vencer ${other} sem depender do desempate`).toBeGreaterThan(result.scores[other]);
      expect(result.scores[secondary]).toBeGreaterThanOrEqual(result.scores[other]);
    }
  });

  it("audita todas as 1.048.576 combinações e permite as dez causas como vencedoras sem empate", () => {
    // Soma apenas as duas afinidades da opção ao entrar e sair de cada ramo.
    // A enumeração protege contra causas inalcançáveis mesmo com exposição igual.
    const optionWeights = causeQuizQuestions.map((question) => question.options.map((option) =>
      Object.entries(option.scores).map(([cause, points]) => ({ index: quizCauseCodes.indexOf(cause as QuizCauseCode), points })),
    ));
    const scores = Array<number>(quizCauseCodes.length).fill(0);
    const strictWins = Array<number>(quizCauseCodes.length).fill(0);
    let paths = 0;
    let tiedPaths = 0;

    function visit(questionIndex: number) {
      if (questionIndex === optionWeights.length) {
        paths += 1;
        let winner = 0;
        let tied = false;
        for (let index = 1; index < scores.length; index += 1) {
          if (scores[index] > scores[winner]) {
            winner = index;
            tied = false;
          } else if (scores[index] === scores[winner]) {
            tied = true;
          }
        }
        if (tied) tiedPaths += 1;
        else strictWins[winner] += 1;
        return;
      }

      for (const weights of optionWeights[questionIndex]) {
        for (const { index, points } of weights) scores[index] += points;
        visit(questionIndex + 1);
        for (const { index, points } of weights) scores[index] -= points;
      }
    }

    visit(0);
    expect(paths).toBe(1_048_576);
    expect(tiedPaths).toBe(241_761);
    expect(strictWins).toEqual([86_888, 81_368, 86_954, 82_636, 83_732, 74_702, 74_475, 75_878, 77_622, 82_560]);
    expect(strictWins.reduce((sum, wins) => sum + wins, tiedPaths)).toBe(paths);
    for (let index = 0; index < quizCauseCodes.length; index += 1) {
      expect(strictWins[index], `${quizCauseCodes[index]} precisa ser alcançável sem empate`).toBeGreaterThan(0);
    }
  }, 15_000);

  it("rejeita formulários incompletos ou respostas incompatíveis com as opções da pergunta", () => {
    const complete = answersFor(0);
    expect(scoreCauseQuiz([])).toBeNull();
    expect(scoreCauseQuiz(complete.slice(1))).toBeNull();
    expect(scoreCauseQuiz([...complete, complete[0]])).toBeNull();
    expect(scoreCauseQuiz([{ ...complete[0], optionId: "unknown-option" }, ...complete.slice(1)])).toBeNull();
    expect(scoreCauseQuiz([{ questionId: "unknown-question", optionId: complete[0].optionId }, ...complete.slice(1)])).toBeNull();
    expect(scoreCauseQuiz([{ questionId: complete[0].questionId, optionId: complete[1].optionId }, ...complete.slice(1)])).toBeNull();
    expect(scoreCauseQuiz([complete[1], ...complete.slice(1)])).toBeNull();
  });

  it("associa as respostas pelo identificador da pergunta independentemente da ordem recebida", () => {
    const answers = answersFor(0);
    expect(scoreCauseQuiz([...answers].reverse())).toEqual(scoreCauseQuiz(answers));
  });

  it.each([
    { position: 0, primary: "food", secondary: "health" },
    { position: 3, primary: "sports", secondary: "technology" },
  ] as const)("resolve o empate da posição $position de forma estável na ordem do catálogo", ({ position, primary, secondary }) => {
    const answers = answersFor(position);
    const result = scoreCauseQuiz(answers);
    expect(result?.primary).toBe(primary);
    expect(result?.secondary).toBe(secondary);
    expect(result?.scores[primary]).toBe(result?.scores[secondary]);
    expect(scoreCauseQuiz(answers)).toEqual(result);
  });
});
