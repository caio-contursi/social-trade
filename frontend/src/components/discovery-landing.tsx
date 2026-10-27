"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, HeartHandshake, Sparkles } from "lucide-react";
import { ProjectExplorer, ProjectInvite } from "@/components/project-explorer";
import { Button } from "@/components/ui/button";
import { PageRetry } from "@/components/page-retry";
import { HeroCarousel } from "@/components/hero-carousel";
import type { Project } from "@/lib/types";

export function DiscoveryLanding({
  projects,
  error,
}: {
  projects: Project[];
  error: boolean;
}) {
  const [exploring, setExploring] = useState(false);
  const previousExploring = useRef(exploring);
  useEffect(() => {
    if (window.location.hash === "#projetos" || new URLSearchParams(window.location.search).get("explorar") === "projetos") {
      setExploring(true);
    }
    document.documentElement.dataset.exploringProjects = exploring ? "true" : "false";
    if (previousExploring.current !== exploring) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      previousExploring.current = exploring;
    }
    window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: exploring }));
    return () => {
      delete document.documentElement.dataset.exploringProjects;
    };
  }, [exploring]);

  useEffect(() => {
    const open = () => setExploring(true);
    const close = () => setExploring(false);
    window.addEventListener("socialtrade:open-projects", open);
    window.addEventListener("socialtrade:show-home", close);
    return () => {
      window.removeEventListener("socialtrade:open-projects", open);
      window.removeEventListener("socialtrade:show-home", close);
    };
  }, []);

  return (
    <div className="discovery-viewport" data-exploring={exploring}>
      <div className="discovery-track">
        <section
          className="discovery-panel page-container grid items-start gap-8 pt-6 pb-4 text-[var(--surface-green-foreground)] sm:gap-10 sm:pt-8 sm:pb-4 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-10 lg:pb-4"
          aria-label="Apresentação da SocialTrade"
          aria-hidden={exploring}
          inert={exploring}
        >
          <div>
            <h1 className="max-w-2xl display-1">
              Apoiar uma causa. <span className="title-mark">Transformar</span>{" "}
              uma realidade.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--surface-green-muted)]">
              Aproximamos empresas, pessoas e projetos sociais para que a
              vontade de fazer a diferença encontre onde acontecer.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={(event) => {
                event.currentTarget.blur();
                setExploring(true);
              }}>
                Encontrar um projeto <ArrowRight className="size-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#557261] bg-[#edf4e8] text-[#17392e] hover:bg-white">
                <Link href="/cadastro?tipo=project">Sou um projeto social</Link>
              </Button>
            </div>
            <dl className="mt-11 grid max-w-xl gap-5 border-t pt-7 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold">Para quem quer apoiar</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--surface-green-muted)]">
                  Empresas e pessoas conhecem projetos e conversam com quem faz.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">Para projetos sociais</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--surface-green-muted)]">
                  Um perfil público para contar sua história e ser encontrado.
                </dd>
              </div>
            </dl>
          </div>
          <div className="relative pb-10">
              <HeroCarousel />
            <div className="pointer-events-none absolute inset-x-5 -bottom-1 rounded-2xl border border-[var(--forest-border)] bg-[var(--forest)] p-5 text-[var(--forest-foreground)] shadow-xl shadow-primary/10 sm:inset-x-12">
              <p className="font-display text-lg leading-snug font-medium">
                O impacto começa com uma conexão.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--forest-muted)]">
                De um lado, quem quer apoiar. Do outro, quem faz acontecer.
              </p>
            </div>
          </div>
        </section>

        <section
          id="projetos"
          data-projects-panel
          className="discovery-panel page-container min-h-0 pb-16 pt-8 sm:pb-24 sm:pt-12"
          aria-label="Explorar projetos sociais"
          aria-hidden={!exploring}
          inert={!exploring}
        >
          <div className="mb-9 max-w-2xl">
            <button
              type="button"
              onClick={() => {
                window.history.replaceState(window.history.state, "", "/");
                setExploring(false);
              }}
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--surface-green-border)] bg-[var(--surface-green-raised)] px-4 text-sm font-semibold text-[var(--surface-green-foreground)] transition hover:-translate-x-1 hover:border-[var(--surface-green-accent)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar ao início
            </button>
            <h1 className="display-2">
              Existe uma causa que <span className="title-mark">conecta</span>{" "}
              você.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Conheça quem transforma realidades todos os dias. Explore as
              iniciativas e descubra onde sua contribuição pode começar.
            </p>
          </div>
          {error ? (
            <div className="public-card rounded-[1.5rem] border p-8 text-[var(--surface-green-foreground)]">
              <h2 className="text-2xl font-medium">Não foi possível carregar os projetos.</h2>
              <p className="mb-5 mt-3 text-sm text-[var(--surface-green-muted)]">
                A conexão com a plataforma está indisponível agora. Tente novamente em instantes.
              </p>
              <PageRetry />
            </div>
          ) : (
            <ProjectExplorer projects={projects} showInvite={false} />
          )}
          <ProjectInvite />
          <CauseFinderPreview />
        </section>
      </div>
    </div>
  );
}

function CauseFinderPreview() {
  return (
    <section id="encontre-sua-causa" className="mt-10 scroll-mt-24 sm:mt-14" aria-labelledby="cause-finder-title">
      <div className="public-card relative grid gap-8 overflow-hidden rounded-[1.5rem] border p-6 text-[var(--surface-green-foreground)] sm:p-9 lg:grid-cols-[1fr_.9fr] lg:items-center lg:gap-12">
        <div aria-hidden="true" className="dot-pattern pointer-events-none absolute inset-0 text-primary opacity-[.055]" />
        <div className="relative">
          <p className="eyebrow mb-3 inline-flex items-center gap-2 text-[#214c3b]">
            Encontre sua causa · Em construção
          </p>
          <h2 id="cause-finder-title" className="font-display text-2xl leading-tight font-medium sm:text-3xl">
            Descubra causas que combinam com você.
          </h2>
          <p className="mt-4 max-w-2xl text-justify text-sm leading-relaxed text-[var(--surface-green-muted)] sm:text-base">
            Estamos preparando uma experiência guiada por perguntas. Com suas respostas, a SocialTrade poderá entender melhor seus interesses e sugerir causas para você explorar com mais confiança.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--surface-green-border)] bg-[var(--surface-green-raised)] px-3 py-1.5 text-xs font-semibold text-[#344e40]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Quiz com recomendações por IA · Em breve
          </span>
        </div>
        <ol className="relative grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            { icon: Compass, title: "O que importa para você?", text: "Temas e causas de interesse." },
            { icon: HeartHandshake, title: "Como quer contribuir?", text: "Formas de apoio que fazem sentido." },
            { icon: Sparkles, title: "Explore possibilidades", text: "Sugestões para conhecer no seu ritmo." },
          ].map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="public-card-quiet flex min-w-0 items-start gap-3 rounded-xl border p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d3e2cf] text-[#155e52]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[10px] font-semibold tracking-[.14em] text-[var(--surface-green-muted)] uppercase">Etapa 0{index + 1}</span>
                <span className="mt-1 block text-sm font-semibold">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--surface-green-muted)]">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
