"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProjectExplorer, ProjectInvite } from "@/components/project-explorer";
import { Button } from "@/components/ui/button";
import { PageRetry } from "@/components/page-retry";
import { HeroCarousel } from "@/components/hero-carousel";
import type { Project } from "@/lib/types";
import { CauseQuiz } from "@/components/cause-quiz";

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
            <h1 className="max-w-2xl display-1 discovery-title">
              Apoiar uma causa. <span className="title-mark">Transformar</span>{" "}
              uma realidade.
            </h1>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={(event) => {
                event.currentTarget.blur();
                setExploring(true);
              }}>
                Encontrar um projeto <ArrowRight className="size-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[var(--surface-green-border)] bg-[var(--surface-green-raised)] text-[var(--surface-green-foreground)] hover:bg-[var(--accent)]">
                <Link data-route-transition href="/cadastro?tipo=project">Sou um projeto social</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <HeroCarousel />
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
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--surface-green-border)] bg-[var(--surface-green-raised)] px-4 text-sm font-semibold text-[var(--surface-green-foreground)] transition hover:-translate-x-1 hover:border-[var(--surface-green-accent)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          <CauseQuiz />
        </section>
      </div>
    </div>
  );
}
