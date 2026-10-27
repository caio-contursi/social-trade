"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  Construction,
  Heart,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceHeading } from "./shared";

const modules = [
  {
    title: "Investimentos do projeto",
    description:
      "Organize futuras informações sobre como os recursos são aplicados nas atividades do projeto.",
    detail: "Planejamento de despesas, comprovantes e prestação de contas.",
    icon: ReceiptText,
  },
  {
    title: "Equipe e prestadores",
    description:
      "Acompanhe pagamentos de funcionários e empresas contratadas para serviços do projeto.",
    detail: "Cadastro de equipe, fornecedores e pagamentos.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Presença",
    description:
      "Registre a participação das pessoas atendidas nas atividades e encontros do projeto.",
    detail: "Listas e histórico de presença.",
    icon: CalendarCheck,
  },
  {
    title: "Benefícios e elegibilidade",
    description:
      "Estruture critérios para benefícios como cestas básicas e outros apoios oferecidos.",
    detail: "Critérios, acompanhamento e histórico de benefícios.",
    icon: Heart,
  },
];

export function ProjectAdminPage() {
  const { user } = useAuth();

  if (user?.account_type !== "project") {
    return (
      <section className="surface">
        <h1 className="page-title">Área de projetos</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Esta área de administração está disponível para contas de projetos sociais.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/painel">Voltar à visão geral</Link>
        </Button>
      </section>
    );
  }

  return (
    <>
      <WorkspaceHeading
        eyebrow="Área do projeto"
        title="Meu projeto."
        description="Um espaço para organizar a atuação do projeto, acompanhar recursos e cuidar das pessoas atendidas."
        action={
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/painel/organizacoes">
              <Building2 className="size-4" />
              Editar perfil do projeto
            </Link>
          </Button>
        }
      />

      <section className="ink-panel relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Construction className="size-3.5" />
                Área em construção
              </Badge>
            </div>
            <h2 className="font-display text-2xl font-medium sm:text-3xl">
              Ferramentas para acompanhar o impacto
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
              Estamos preparando recursos para ajudar seu projeto a registrar atividades,
              despesas e apoios com mais clareza. As funções abaixo são uma prévia e ainda
              não registram nem movimentam dados ou pagamentos.
            </p>
          </div>
          <ClipboardCheck className="hidden size-12 shrink-0 text-energy sm:block" aria-hidden="true" />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="project-tools-heading">
        <div className="mb-4">
          <p className="eyebrow mb-2">Em breve</p>
          <h2 id="project-tools-heading" className="font-display text-2xl font-medium">
            Gestão do projeto
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((module) => (
            <article key={module.title} className="surface flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <module.icon className="size-5" aria-hidden="true" />
                </span>
                <Badge variant="outline" className="border-energy/50 text-foreground">
                  Em breve
                </Badge>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {module.description}
              </p>
              <div className="mt-5 flex items-start gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                <UsersRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {module.detail}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-2xl border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold">Enquanto isso, mantenha seu perfil atualizado</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Revise as informações públicas e a apresentação da iniciativa.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/painel/organizacoes">
            Editar perfil <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  );
}
