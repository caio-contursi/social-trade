"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { causeProjectGuides, causeQuizQuestions, quizCauseCodes, quizCauseLabel, scoreCauseQuiz, type CauseQuizAnswer } from "@/lib/cause-quiz";
import type { QuizCauseCode } from "@/lib/cause-quiz";
import { causeVisual } from "@/lib/causes";
import { Button } from "@/components/ui/button";
import { OpenProjectsLink } from "@/components/open-projects-link";

export function CauseQuiz() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<CauseQuizAnswer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const result = useMemo(() => scoreCauseQuiz(answers), [answers]);
  const question = causeQuizQuestions[step];

  function choose(optionId: string) {
    setSelected(optionId);
  }

  function confirmChoice() {
    if (!question || !selected) return;
    const next = [...answers.filter((answer) => answer.questionId !== question.id), { questionId: question.id, optionId: selected }];
    setAnswers(next);
    const nextStep = step + 1;
    setStep(nextStep);
    setSelected(next.find((answer) => answer.questionId === causeQuizQuestions[nextStep]?.id)?.optionId ?? null);
  }

  function back() {
    if (step <= 0) {
      setStep(-1);
      setSelected(null);
      return;
    }
    const priorAnswer = answers.find((answer) => answer.questionId === causeQuizQuestions[step - 1].id);
    setSelected(priorAnswer?.optionId ?? null);
    setStep(step - 1);
  }

  function start() {
    setStep(0);
    setSelected(answers.find((answer) => answer.questionId === causeQuizQuestions[0].id)?.optionId ?? null);
  }

  function reset() {
    setAnswers([]);
    setSelected(null);
    setStep(-1);
  }

  const displayResult = step === causeQuizQuestions.length && result;

  return (
    <section id="encontre-sua-causa" className="mt-10 scroll-mt-24 sm:mt-14" aria-labelledby="cause-finder-title">
      <div className="cause-quiz-card public-card relative overflow-hidden rounded-[1.5rem] border p-5 text-[var(--surface-green-foreground)] shadow-xl shadow-primary/5 sm:p-8 lg:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-border opacity-70" />
        <div className="relative">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2 inline-flex items-center gap-2"><Sparkles className="size-3.5" aria-hidden="true" /> Encontre sua causa</p>
              <h2 id="cause-finder-title" className="max-w-2xl font-display text-3xl leading-tight font-medium sm:text-4xl">Uma escolha de cada vez. <span className="title-mark">Uma causa mais perto.</span></h2>
              <p data-testid="cause-quiz-intro" className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Explore 10 dilemas do cotidiano. Pense no que você preservaria e no que aceitaria adiar para descobrir afinidades com causas sociais.</p>
            </div>
            {step >= 0 && <p className="rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-secondary-foreground">{Math.min(step + 1, 10)} de 10</p>}
          </header>

          {step === -1 ? (
            <div className="mt-7 grid items-end gap-6 border-t border-border pt-6 md:grid-cols-[1fr_auto]">
              <div><p className="font-display text-xl font-medium">Quando toda escolha tem um custo, o que pesa para você?</p><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Todas as alternativas protegem algo importante. Compare os caminhos e confirme sua escolha no seu tempo. Ao final, conheça as causas mais próximas das suas respostas.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">10 dilemas</span><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{quizCauseCodes.length} causas</span><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Sem cadastro</span></div></div>
              <Button size="lg" onClick={start} className="w-full md:w-auto">Começar quiz <ArrowRight className="size-4" /></Button>
            </div>
          ) : displayResult ? (
            <ResultView result={displayResult} onRestart={reset} />
          ) : question ? (
            <div className="mt-7 border-t border-border pt-5" aria-live="polite">
              <div className="mb-5 flex items-center gap-3">
                <button type="button" onClick={back} aria-label="Voltar pergunta" className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-accent"><ArrowLeft className="size-4" /></button>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso do quiz" aria-valuemin={0} aria-valuemax={10} aria-valuenow={step}><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${step * 10}%` }} /></div>
                <span className="text-xs font-semibold text-muted-foreground">{step + 1}/10</span>
              </div>
              <p data-testid="quiz-scenario" className="text-xs font-semibold tracking-[.13em] text-muted-foreground uppercase">Dilema {String(step + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 max-w-3xl font-display text-2xl leading-snug font-medium sm:text-3xl">{question.prompt}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{question.note}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {question.options.map((option) => {
                  const active = selected === option.id;
                  return <button key={option.id} type="button" onClick={() => choose(option.id)} aria-pressed={active} className={`group flex min-h-[76px] items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 text-left text-sm font-medium leading-relaxed text-foreground transition-all hover:border-primary hover:bg-accent ${active ? "scale-[.99] border-primary ring-2 ring-primary/30" : ""}`}><span>{option.text}</span><span className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-transparent group-hover:border-primary"}`}><Check className="size-4" /></span></button>;
                })}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-muted-foreground">Você pode mudar sua escolha antes de continuar.</p>
                <Button size="lg" disabled={!selected} onClick={confirmChoice}>{step === causeQuizQuestions.length - 1 ? "Ver meu resultado" : "Confirmar escolha"}<ArrowRight className="size-4" /></Button>
              </div>
            </div>
          ) : null}
          <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Esta sugestão é um ponto de partida baseado apenas no que você escolheu. Ela não mede impacto nem substitui conhecer cada projeto.</p>
        </div>
      </div>
    </section>
  );
}

function ResultView({ result, onRestart }: { result: NonNullable<ReturnType<typeof scoreCauseQuiz>>; onRestart: () => void }) {
  const primary = result.primary as QuizCauseCode;
  const secondary = result.secondary as QuizCauseCode | null;
  const primaryVisual = causeVisual(primary);
  const primaryGuide = causeProjectGuides[primary];
  const tiedCauses = quizCauseCodes.filter((cause) => result.scores[cause] === result.scores[primary]);
  const tied = tiedCauses.length > 1;
  const topScores = Object.entries(result.scores).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return (
    <div className="mt-7 border-t border-border pt-6" aria-live="polite">
      <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
        <div className="rounded-2xl border border-border bg-background p-5 sm:p-7">
          <p className="text-xs font-semibold tracking-[.14em] text-muted-foreground uppercase">{tied ? "Uma das suas causas em destaque" : "Sua causa em destaque"}</p>
          <div className="mt-4 flex items-center gap-4">
            <span className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${primaryVisual.className}`}><primaryVisual.icon className="size-8" aria-hidden="true" /></span>
            <div><h3 className="font-display text-3xl font-medium">{quizCauseLabel(primary)}</h3><p className="mt-1 text-sm text-muted-foreground">{tied ? "Mais de uma causa se destacou na mesma medida nas suas respostas." : `Afinidade que mais se destacou entre as ${quizCauseCodes.length} causas disponíveis no filtro.`}</p></div>
          </div>
          <section data-testid="cause-project-guide" className="mt-6 rounded-2xl border border-border bg-secondary/50 p-4 sm:p-5" aria-labelledby="cause-project-guide-title">
            <h4 id="cause-project-guide-title" className="font-display text-xl font-medium">Que tipos de projeto se relacionam com {quizCauseLabel(primary).toLowerCase()}?</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{primaryGuide.summary}</p>
            <p className="mt-4 text-sm font-semibold">Exemplos de iniciativas</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {primaryGuide.projectTypes.map((projectType) => <li key={projectType}>{projectType}</li>)}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Os exemplos ajudam a entender a categoria. Cada projeto pode atuar em mais de uma causa; confira a descrição e as áreas informadas pela própria iniciativa.</p>
          </section>
          <div className="mt-6"><div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground"><span>Pontos entre as suas escolhas</span><span>{result.percentages[primary]}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${result.percentages[primary]}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">É a parcela dos pontos atribuídos pelas suas respostas que ficou com esta causa. Não é uma probabilidade estatística.</p></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><OpenProjectsLink cause={primary}>Explorar projetos de {quizCauseLabel(primary).toLowerCase()} <ArrowRight className="size-4" /></OpenProjectsLink></Button>
            <Button variant="outline" size="lg" onClick={onRestart}><RotateCcw className="size-4" />Refazer quiz</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-secondary/70 p-5 text-secondary-foreground sm:p-6">
          <h4 className="font-display text-xl font-medium">Como chegamos aqui</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Cada escolha aproxima você de duas causas. O resultado combina as dez respostas, por isso uma alternativa isolada não define sua causa.</p>
          <ul className="mt-4 space-y-3" aria-label="Pontuação por causa">
            {topScores.map(([code]) => <li key={code}><div className="mb-1 flex justify-between text-xs"><span className="font-medium">{quizCauseLabel(code as QuizCauseCode)}</span><span className="text-muted-foreground">{result.percentages[code as QuizCauseCode]}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75" style={{ width: `${result.percentages[code as QuizCauseCode]}%` }} /></div></li>)}
          </ul>
          {(tied || secondary) && <p className="mt-5 rounded-xl border border-border bg-background/70 p-3 text-sm"><span className="font-semibold">{tied ? "Afinidades no mesmo nível:" : "Outra causa para conhecer:"}</span> {tied ? tiedCauses.map(quizCauseLabel).join(", ") : quizCauseLabel(secondary!)}.</p>}
        </div>
      </div>
    </div>
  );
}
