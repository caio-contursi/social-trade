import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleCheck,
  CircleDashed,
  HeartHandshake,
  MessageCircle,
  Search,
  Sprout,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageRetry } from "@/components/page-retry";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { causeCodes, causeVisual } from "@/lib/causes";
import { publicProjects } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Encontre uma causa",
    description:
      "Explore projetos por área de atuação e localidade. Descubra iniciativas que se conectam com seus valores.",
  },
  {
    number: "02",
    icon: HeartHandshake,
    title: "Conheça a história",
    description:
      "Leia sobre os objetivos, a atuação e os resultados apresentados pelo projeto. Entenda quem está por trás de cada iniciativa.",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Comece uma conversa",
    description:
      "Use os canais públicos informados pelo projeto para conversar sobre possibilidades de apoio e colaboração.",
  },
];

const available = [
  {
    title: "Doações Pix diretas",
    description:
      "Empresas e pessoas físicas transferem direto para a chave conferida do projeto; a plataforma registra e acompanha a confirmação.",
  },
  {
    title: "Perfis públicos de projetos",
    description:
      "História, objetivos, ações e canais de contato, informados pelos próprios projetos.",
  },
  {
    title: "Busca por causa e cidade",
    description:
      "Filtros para encontrar iniciativas perto de você ou da sua empresa.",
  },
];

const nextSteps = [
  "Pagamentos automatizados por PSP e cartão",
  "Registro das doações na rede Solana",
  "Prestação de contas ampliada dos projetos",
];

export default async function HomePage() {
  const { projects, error } = await publicProjects();
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <section className="page-container grid items-center gap-12 pt-10 pb-16 sm:pt-14 sm:pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
          <div>
            <h1 className="max-w-2xl display-1">
              Apoiar uma causa. <span className="title-mark">Transformar</span>{" "}
              uma realidade.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Aproximamos empresas, pessoas e projetos sociais para que a
              vontade de fazer a diferença encontre onde acontecer.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/projetos">
                  Encontrar um projeto <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/cadastro?tipo=project">Sou um projeto social</Link>
              </Button>
            </div>
            <dl className="mt-11 grid max-w-xl gap-5 border-t pt-7 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold">Para quem quer apoiar</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Empresas e pessoas conhecem projetos e conversam com quem faz.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">Para projetos sociais</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Um perfil público para contar sua história e ser encontrado.
                </dd>
              </div>
            </dl>
          </div>
          <div className="relative pb-10">
            <div className="relative aspect-[1.05] overflow-hidden rounded-[2rem] bg-secondary sm:aspect-[1.15] lg:aspect-[.92]">
              <Image
                src="/images/voluntariado.jpg"
                alt="Pessoa voluntária de costas durante uma atividade comunitária"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
              <p className="absolute top-5 right-5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white">
                Imagem ilustrativa
              </p>
            </div>
            <div className="absolute inset-x-5 -bottom-1 rounded-2xl border bg-card p-5 shadow-xl shadow-primary/10 sm:inset-x-12">
              <div className="flex items-center gap-4">
                <BrandMark className="size-11" />
                <div>
                  <p className="font-display text-lg leading-snug font-medium">
                    O impacto começa com uma conexão.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    De um lado, quem quer apoiar. Do outro, quem faz acontecer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-card" aria-labelledby="causes-title">
          <div className="page-container py-10">
            <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Qual causa move você?</p>
                <h2 id="causes-title" className="mt-2 text-2xl font-medium">
                  Encontre sua conexão.
                </h2>
              </div>
              <Link
                href="/projetos"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Ver todos os projetos <ArrowRight className="size-4" />
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {causeCodes.map((code) => {
                const cause = causeVisual(code);
                return (
                  <li key={code}>
                    <Link
                      href={`/projetos?causa=${code}`}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md",
                        cause.className,
                      )}
                    >
                      <cause.icon
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.8}
                      />
                      {cause.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          className="page-container py-16 sm:py-24"
          aria-labelledby="projects-title"
        >
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow mb-3">Do propósito à ação</p>
              <h2 id="projects-title" className="display-2">
                Conheça quem já{" "}
                <span className="title-mark">faz acontecer</span>.
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Projetos com histórias para contar e caminhos para construir.
                Encontre uma causa que faça sentido para você.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/projetos">
                Explorar todos os projetos <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          {error ? (
            <div className="rounded-2xl border bg-card p-7">
              <h3 className="text-xl font-medium">
                Os projetos não carregaram agora.
              </h3>
              <p className="mt-2 mb-4 text-sm text-muted-foreground">
                Tente novamente em instantes para conhecer as iniciativas
                cadastradas.
              </p>
              <PageRetry />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 2).map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
              <div className="relative flex min-h-80 flex-col items-start justify-end overflow-hidden rounded-[1.4rem] border border-dashed border-primary/35 bg-muted p-7 sm:p-8">
                <div
                  aria-hidden="true"
                  className="dot-pattern absolute inset-0 text-primary opacity-[.07]"
                />
                <div className="relative mb-auto flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                  <Sprout className="size-6" strokeWidth={1.5} />
                </div>
                <p className="eyebrow relative mt-10">
                  Espaço para novas histórias
                </p>
                <h3 className="relative mt-3 text-[1.7rem] leading-tight font-medium">
                  {projects.length
                    ? "Sua causa também tem lugar aqui."
                    : "A primeira conexão pode ser a sua."}
                </h3>
                <p className="relative mt-3 mb-7 text-sm leading-relaxed text-muted-foreground">
                  {projects.length
                    ? "Apresente seu projeto e aproxime sua iniciativa de quem quer contribuir."
                    : "Ainda não há projetos cadastrados. Compartilhe sua iniciativa e faça parte do começo dessa rede."}
                </p>
                <Button asChild className="relative">
                  <Link href="/cadastro?tipo=project">
                    Cadastrar meu projeto <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        <section
          className="border-y bg-card"
          id="como-funciona"
          aria-labelledby="how-title"
        >
          <div className="page-container py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="eyebrow mb-3">Simples para começar</p>
              <h2 id="how-title" className="display-2">
                Grandes conexões começam com{" "}
                <span className="title-mark">pequenos passos</span>.
              </h2>
            </div>
            <div className="relative mt-14">
              <div
                aria-hidden="true"
                className="absolute top-7 right-[16%] left-[16%] hidden border-t-2 border-dashed border-primary/25 md:block"
              />
              <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
                {steps.map(({ number, icon: Icon, title, description }) => (
                  <li key={number} className="relative">
                    <div className="flex items-center gap-4">
                      <span className="flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                        <Icon
                          className="size-6"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="font-display text-5xl leading-none font-light text-primary/70 italic">
                        {number}
                      </span>
                    </div>
                    <h3 className="mt-6 text-2xl font-medium">{title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          className="page-container py-16 sm:py-24"
          id="transparencia"
          aria-labelledby="trust-title"
        >
          <div className="ink-panel relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 dark:ring-1 dark:ring-white/10">
            <div
              aria-hidden="true"
              className="dot-pattern absolute inset-0 opacity-[.06]"
            />
            <div className="relative grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
              <div>
                <p className="eyebrow mb-4">Clareza em cada etapa</p>
                <h2 id="trust-title" className="display-2">
                  Confiança se constrói com{" "}
                  <span className="title-mark">informação</span>.
                </h2>
                <p className="mt-6 max-w-md leading-relaxed text-ink-foreground/80">
                  Mostramos com clareza de onde vêm as informações e o que já
                  está disponível. As histórias e os resultados são apresentados
                  pelos próprios projetos; avaliá-los faz parte da sua decisão
                  de apoiar.
                </p>
                <Button asChild variant="energy" size="lg" className="mt-8">
                  <Link href="/projetos">
                    Conhecer os projetos <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/[.06] p-6 ring-1 ring-white/10">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CircleCheck
                      className="size-4 text-energy"
                      aria-hidden="true"
                    />
                    Disponível agora
                  </p>
                  <ul className="mt-4 space-y-4">
                    {available.map((item) => (
                      <li key={item.title}>
                        <p className="font-display text-lg font-medium">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-foreground/75">
                          {item.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-dashed border-white/25 p-6">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CircleDashed
                      className="size-4 text-energy"
                      aria-hidden="true"
                    />
                    Próximos passos, ainda não disponíveis
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {nextSteps.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 text-sm text-ink-foreground/85"
                      >
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-energy"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="page-container pb-16 sm:pb-24"
          aria-labelledby="cta-title"
        >
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow mb-3">Todo apoio tem um começo</p>
            <h2 id="cta-title" className="display-2">
              Sua próxima conexão pode fazer a{" "}
              <span className="title-mark">diferença</span>.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-[1.4rem] border bg-card p-7 sm:p-9">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Building2
                  className="size-6"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-6 text-2xl font-medium">
                Quer apoiar uma causa?
              </h3>
              <p className="mt-3 mb-8 leading-relaxed text-muted-foreground">
                Empresas e pessoas físicas cadastradas podem conhecer projetos,
                fazer doações Pix diretamente e conversar com quem faz.
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                <Button asChild className="w-fit">
                  <Link href="/cadastro?tipo=donor">
                    Quero apoiar como empresa <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-fit">
                  <Link href="/cadastro?tipo=person">
                    Quero apoiar como pessoa física <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col rounded-[1.4rem] border bg-card p-7 sm:p-9">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Sprout
                  className="size-6"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-6 text-2xl font-medium">
                Tem um projeto social?
              </h3>
              <p className="mt-3 mb-8 leading-relaxed text-muted-foreground">
                Apresente sua iniciativa com um perfil público e seja encontrado
                por quem quer contribuir.
              </p>
              <Button asChild className="mt-auto w-fit">
                <Link href="/cadastro?tipo=project">
                  Quero apresentar meu projeto <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
