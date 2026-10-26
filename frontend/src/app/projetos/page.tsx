import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageRetry } from "@/components/page-retry";
import { ProjectExplorer } from "@/components/project-explorer";
import { PageTransition } from "@/components/page-transition";
import { publicProjects } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Encontre uma causa",
  description:
    "Conheça projetos sociais, explore causas e encontre iniciativas para apoiar.",
};

export default async function ProjectsPage() {
  const { projects, error } = await publicProjects();
  return (
    <>
      <SiteHeader />
      <PageTransition>
      <main
        id="conteudo"
        className="page-container pb-20 pt-10 sm:pb-24 sm:pt-16"
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
            <h2 className="text-2xl font-medium">
              Não foi possível carregar os projetos.
            </h2>
            <p className="mb-5 mt-3 text-sm text-muted-foreground">
              A conexão com a plataforma está indisponível agora. Tente
              novamente em instantes.
            </p>
            <PageRetry />
          </div>
        ) : (
          <Suspense
            fallback={
              <p role="status" className="py-10 text-muted-foreground">
                Preparando os projetos...
              </p>
            }
          >
            <ProjectExplorer projects={projects} />
          </Suspense>
        )}
      </main>
      </PageTransition>
      <SiteFooter />
    </>
  );
}
