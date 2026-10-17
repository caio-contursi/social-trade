import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleHelp,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Leaf,
  MessageCircle,
  Search,
  Sprout,
  Utensils,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageRetry } from "@/components/page-retry";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { publicProjects } from "@/lib/server-api";

export const dynamic = "force-dynamic";

const causes = [
  { code: "food", label: "Alimentação", icon: Utensils },
  { code: "education", label: "Educação", icon: GraduationCap },
  { code: "environment", label: "Meio ambiente", icon: Leaf },
  { code: "health", label: "Saúde", icon: HeartPulse },
];

export default async function HomePage() {
  const { projects, error } = await publicProjects();
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <section className="page-container grid items-center gap-10 pb-14 pt-9 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24 lg:pt-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-3.5 py-2 text-xs font-medium text-primary">
              <Sprout className="size-3.5" aria-hidden="true" /> Boas causas
              merecem boas conexões
            </div>
            <h1 className="max-w-2xl text-[2.7rem] font-semibold leading-[1.08] sm:text-6xl xl:text-[4.6rem]">
              Apoiar uma causa.
              <br />
              <span className="text-primary">Transformar uma realidade.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Aproximamos empresas e projetos sociais para que a vontade de
              fazer a diferença encontre onde acontecer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6">
                <Link href="/projetos">
                  Encontrar um projeto <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link href="/cadastro?tipo=project">Sou um projeto social</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs leading-relaxed text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <HeartHandshake className="size-4" strokeWidth={1.6} />
              </span>
              <p>
                Histórias para conhecer, causas diversas.
                <br />
                Um ponto de encontro para começar.
              </p>
            </div>
          </div>
          <div className="relative pb-8 lg:pl-2">
            <div className="relative aspect-[1.06] overflow-hidden rounded-[1.8rem] bg-secondary sm:aspect-[1.12] lg:aspect-[.94]">
              <Image
                src="/images/voluntariado.jpg"
                alt="Pessoa voluntária de costas durante uma atividade comunitária"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
              <p className="absolute bottom-5 right-5 rounded-full bg-black/30 px-3 py-1.5 text-[10px] tracking-wide text-white">
                Imagem ilustrativa
              </p>
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-background/95 px-3 py-2 text-xs font-medium text-foreground">
                <span className="size-1.5 rounded-full bg-primary" /> Gente que
                faz a diferença
              </div>
            </div>
            <div className="absolute -bottom-1 left-4 right-10 rounded-2xl border bg-card p-5 shadow-lg shadow-primary/5 sm:left-7 sm:right-16">
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <HeartHandshake className="size-6" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold sm:text-base">
                    O impacto começa com uma conexão.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Uma boa conversa pode abrir novos caminhos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          className="border-y bg-secondary/35"
          aria-labelledby="causes-title"
        >
          <div className="page-container flex flex-col gap-6 py-7 lg:flex-row lg:items-center lg:gap-12">
            <div className="shrink-0">
              <p className="eyebrow text-[10px]">Qual causa move você?</p>
              <h2 id="causes-title" className="mt-1 text-lg font-semibold">
                Encontre sua conexão.
              </h2>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              {causes.map(({ code, label, icon: Icon }) => (
                <Link
                  key={code}
                  href={`/projetos?causa=${code}`}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-transparent bg-background/75 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-card sm:px-4"
                >
                  <span className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                    <Icon
                      className="size-4 shrink-0 text-primary"
                      strokeWidth={1.6}
                    />
                    {label}
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section
          className="page-container py-16 sm:py-24"
          aria-labelledby="projects-title"
        >
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow mb-3">Do propósito à ação</p>
              <h2
                id="projects-title"
                className="text-3xl font-semibold sm:text-4xl"
              >
                Conheça quem já faz acontecer.
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                Projetos com histórias para contar e caminhos para construir.
                Encontre uma causa que faça sentido para você.
              </p>
            </div>
            <Link
              href="/projetos"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Explorar todos os projetos <ArrowRight className="size-4" />
            </Link>
          </div>
          {error ? (
            <div className="rounded-2xl border bg-card p-7">
              <h3 className="text-xl font-semibold">
                Os projetos não carregaram agora.
              </h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
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
              <div className="flex min-h-80 flex-col items-start justify-center rounded-2xl border border-dashed border-primary/30 bg-secondary/40 p-7 sm:p-8">
                <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-background text-primary">
                  <Sprout className="size-6" strokeWidth={1.5} />
                </div>
                <p className="eyebrow text-[10px]">
                  Espaço para novas histórias
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  {projects.length
                    ? "Sua causa também tem lugar aqui."
                    : "A primeira conexão pode ser a sua."}
                </h3>
                <p className="mb-7 mt-3 text-sm leading-relaxed text-muted-foreground">
                  {projects.length
                    ? "Apresente seu projeto e aproxime sua iniciativa de quem quer contribuir."
                    : "Ainda não há projetos cadastrados. Compartilhe sua iniciativa e faça parte do começo dessa rede."}
                </p>
                <Button asChild variant="outline" className="bg-background">
                  <Link href="/cadastro?tipo=project">
                    Cadastrar meu projeto <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </section>
        <section
          className="border-y bg-secondary/30"
          id="como-funciona"
          aria-labelledby="how-title"
        >
          <div className="page-container py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow mb-3">Simples para começar</p>
              <h2 id="how-title" className="text-3xl font-semibold sm:text-4xl">
                Grandes conexões começam com pequenos passos.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Um caminho para descobrir, entender e se aproximar.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
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
              ].map(({ number, icon: Icon, title, description }) => (
                <div key={number} className="border-t border-primary/20 pt-6">
                  <div className="mb-5 flex items-center justify-between">
                    <Icon className="size-7 text-primary" strokeWidth={1.5} />
                    <span className="font-display text-xs font-semibold text-muted-foreground">
                      {number}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          className="page-container grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:gap-20"
          id="transparencia"
          aria-labelledby="trust-title"
        >
          <div>
            <p className="eyebrow mb-3">Clareza em cada etapa</p>
            <h2 id="trust-title" className="text-3xl font-semibold sm:text-4xl">
              Confiança se constrói com informação.
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Queremos tornar o apoio social mais próximo e transparente. Por
              isso, mostramos com clareza de onde vêm as informações e o que
              está disponível na plataforma.
            </p>
            <Link
              href="/projetos"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Conhecer os projetos <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-6">
              <div className="mb-3 flex items-center gap-3">
                <HeartHandshake
                  className="size-5 text-primary"
                  strokeWidth={1.6}
                />
                <h3 className="font-display font-semibold">
                  Informações dos próprios projetos
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Histórias, objetivos e resultados são apresentados pelas
                organizações. Um perfil cadastrado indica a apresentação do
                projeto; a avaliação dessas informações faz parte da sua decisão
                de apoiar.
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/50 p-6">
              <div className="mb-3 flex items-center gap-3">
                <CircleHelp
                  className="size-5 text-muted-foreground"
                  strokeWidth={1.6}
                />
                <h3 className="font-display font-semibold">
                  Transparência, em evolução
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Doações pela plataforma, comprovação na rede Solana e prestação
                de contas fazem parte dos próximos passos. Esses recursos ainda
                não estão disponíveis.
              </p>
            </div>
          </div>
        </section>
        <section className="page-container pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-[1.8rem] bg-[#196c61] px-6 py-12 text-white sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="absolute -right-28 -top-36 size-[28rem] rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-56 -right-8 size-[30rem] rounded-full border border-white/10"
            />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <p className="mb-4 text-xs font-semibold tracking-[.18em] text-white/70 uppercase">
                  Todo apoio tem um começo
                </p>
                <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Sua próxima conexão pode fazer a diferença.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                  Seja para apoiar uma causa ou apresentar seu projeto, existe
                  um lugar para você nessa história.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  asChild
                  className="h-12 bg-white px-6 text-[#196c61] hover:bg-white/90"
                >
                  <Link href="/cadastro?tipo=donor">
                    <Building2 className="size-4" /> Quero apoiar como empresa
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 border-white/35 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/cadastro?tipo=project">
                    Quero apresentar meu projeto{" "}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
