"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectExplorer } from "@/components/project-explorer";
import { Button } from "@/components/ui/button";
import { PageRetry } from "@/components/page-retry";
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
          className="discovery-panel page-container grid items-center gap-12 pt-10 pb-16 sm:pt-14 sm:pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24"
          aria-label="Apresentação da SocialTrade"
          aria-hidden={exploring}
          inert={exploring}
        >
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
              <Button size="lg" onClick={(event) => {
                event.currentTarget.blur();
                setExploring(true);
              }}>
                Encontrar um projeto <ArrowRight className="size-4" />
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
              <div
                className="absolute inset-0 bg-[url('/images/voluntariado.jpg')] bg-cover bg-center"
                role="img"
                aria-label="Pessoa voluntária durante uma atividade comunitária"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
              <p className="absolute top-5 right-5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white">
                Imagem ilustrativa
              </p>
            </div>
            <div className="absolute inset-x-5 -bottom-1 rounded-2xl border bg-card p-5 shadow-xl shadow-primary/10 sm:inset-x-12">
              <p className="font-display text-lg leading-snug font-medium">
                O impacto começa com uma conexão.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                De um lado, quem quer apoiar. Do outro, quem faz acontecer.
              </p>
            </div>
          </div>
        </section>

        <section
          id="projetos"
          className="discovery-panel page-container min-h-[calc(100svh-4.5rem)] pb-16 pt-8 sm:pb-24 sm:pt-12"
          aria-label="Explorar projetos sociais"
          aria-hidden={!exploring}
          inert={!exploring}
        >
          <div className="mb-9 max-w-2xl">
            <p className="eyebrow mb-3">Encontre seu propósito em comum</p>
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
            <div className="rounded-2xl border bg-card p-8">
              <h2 className="text-2xl font-medium">Não foi possível carregar os projetos.</h2>
              <p className="mb-5 mt-3 text-sm text-muted-foreground">
                A conexão com a plataforma está indisponível agora. Tente novamente em instantes.
              </p>
              <PageRetry />
            </div>
          ) : (
            <ProjectExplorer projects={projects} showInvite={false} />
          )}
        </section>
      </div>
    </div>
  );
}
