"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { causeVisual } from "@/lib/causes";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectVisual({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const cause = causeVisual(project.areas[0]);
  const Icon = cause.icon;
  let logo: string | null = null;
  try {
    const url = new URL(project.logo_url || "");
    if (["https:", "http:"].includes(url.protocol)) logo = url.href;
  } catch {}
  return (
    <div
      className={cn(
        "relative flex min-h-44 items-center justify-center overflow-hidden",
        cause.className,
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="dot-pattern absolute inset-0 opacity-[.13]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-16 -bottom-24 size-60 rounded-full bg-current opacity-[.07]"
      />
      {logo && !broken ? (
        <img
          src={logo}
          alt={`Logotipo de ${project.name}`}
          onError={() => setBroken(true)}
          loading="lazy"
          width={160}
          height={160}
          className="relative m-8 max-h-32 max-w-[60%] rounded-xl bg-logo-surface object-contain p-3 shadow-sm"
        />
      ) : (
        <Icon
          aria-hidden="true"
          className="relative size-16"
          strokeWidth={1.2}
        />
      )}
      <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-[11px] font-semibold tracking-[.1em] uppercase">
        <cause.icon aria-hidden="true" className="size-3.5" />
        {cause.label}
      </span>
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="public-card group flex h-full flex-col overflow-hidden rounded-[1.5rem] border text-[var(--surface-green-foreground)] transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="relative">
        <ProjectVisual project={project} />
        {project.is_demo && (
          <Badge className="absolute top-3 right-3 gap-1.5 border border-border bg-card/95 text-[#17392e]">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-energy"
            />
            Demonstração
          </Badge>
        )}
        {project.pix_donations_available && (
          <Badge variant="secondary" className="absolute right-3 bottom-3 bg-card/95 text-[#17392e]">
            Pix direto disponível
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--surface-green-muted)]">
          <MapPin className="size-3.5" aria-hidden="true" />
          {project.city}, {project.state}
        </p>
        <h3 className="mt-2.5 font-sans text-[1.4rem] leading-tight font-semibold tracking-tight">
          <Link
            href={`/projetos/${encodeURIComponent(project.slug)}#conteudo`}
            scroll
            className="rounded-sm underline-offset-4 decoration-energy decoration-2 hover:underline"
          >
            {project.name}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--surface-green-muted)]">
          {project.short_description}
        </p>
        <ul className="mt-4 mb-6 flex flex-wrap gap-1.5" aria-label="Causas">
          {project.areas.slice(0, 2).map((area) => {
            const cause = causeVisual(area);
            return (
              <li key={area}>
                <Badge
                  variant="outline"
                  className="gap-1.5 bg-background text-[11px] font-medium text-[#17392e]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full border border-current",
                      cause.className,
                    )}
                  />
                  {cause.label}
                </Badge>
              </li>
            );
          })}
          {project.areas.length > 2 && (
            <li>
              <Badge
                variant="outline"
                className="bg-background text-[11px] font-medium text-[#17392e]"
              >
                +{project.areas.length - 2} causas
              </Badge>
            </li>
          )}
        </ul>
        <Link
          href={`/projetos/${encodeURIComponent(project.slug)}#conteudo`}
          scroll
          aria-label={`Conhecer ${project.name}`}
          className="mt-auto inline-flex items-center justify-between gap-3 border-t pt-4 text-sm font-semibold text-[#145b4b]"
        >
          Conhecer o projeto
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </article>
  );
}
