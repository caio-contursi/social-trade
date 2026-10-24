"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ListFilter, Search, SearchX, X } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { areaLabels, compareRecentProjects } from "@/lib/catalog";
import type { Project } from "@/lib/types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function ProjectExplorer({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("busca") || "");
  const cause = params.get("causa") || "all";
  const location = params.get("local") || "all";
  const order = params.get("ordem") === "nome" ? "nome" : "recentes";
  const querySearch = params.get("busca") || "";

  useEffect(() => {
    setSearch(querySearch);
  }, [querySearch]);

  function updateQuery(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (
        !value ||
        value === "all" ||
        (key === "ordem" && value === "recentes")
      )
        next.delete(key);
      else next.set(key, value);
    });
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }

  const locations = useMemo(
    () =>
      [
        ...new Set(
          projects.map((project) => `${project.city}/${project.state}`),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [projects],
  );
  const filtered = useMemo(
    () =>
      projects
        .filter((project) => {
          const text = normalize(
            [
              project.name,
              project.city,
              project.state,
              project.short_description,
              project.objective || "",
              ...project.areas.map((area) => areaLabels[area] || area),
            ].join(" "),
          );
          return (
            (!querySearch || text.includes(normalize(querySearch.trim()))) &&
            (cause === "all" || project.areas.includes(cause)) &&
            (location === "all" ||
              `${project.city}/${project.state}` === location)
          );
        })
        .sort((a, b) =>
          order === "nome"
            ? a.name.localeCompare(b.name, "pt-BR")
            : compareRecentProjects(a, b),
        ),
    [projects, querySearch, cause, location, order],
  );
  const hasFilters = !!querySearch || cause !== "all" || location !== "all";
  // Com 1 ou 2 resultados o convite entra na grade; com mais, vira faixa no fim.
  const showInvite = filtered.length > 0 && filtered.length < 3;

  function reset() {
    setSearch("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div>
      <div className="rounded-[1.6rem] border bg-card p-4 shadow-sm shadow-primary/5 sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateQuery({ busca: search.trim() });
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Label htmlFor="project-search" className="sr-only">
              Buscar projetos por nome, cidade ou palavra
            </Label>
            <Search
              className="absolute left-4 top-3.5 size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="project-search"
              name="busca"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busque por nome, cidade ou palavra..."
              maxLength={160}
              className="h-12 rounded-full bg-background pl-12"
            />
          </div>
          <Button type="submit" size="lg">
            Buscar projetos
          </Button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label
              htmlFor="cause-filter"
              className="mb-2 text-xs text-muted-foreground"
            >
              Causa
            </Label>
            <Select
              value={cause}
              onValueChange={(value) => updateQuery({ causa: value })}
            >
              <SelectTrigger
                id="cause-filter"
                className="w-full rounded-full bg-background"
              >
                <SelectValue placeholder="Todas as causas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as causas</SelectItem>
                {Object.entries(areaLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="location-filter"
              className="mb-2 text-xs text-muted-foreground"
            >
              Localidade
            </Label>
            <Select
              value={location}
              onValueChange={(value) => updateQuery({ local: value })}
            >
              <SelectTrigger
                id="location-filter"
                className="w-full rounded-full bg-background"
              >
                <SelectValue placeholder="Todas as localidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as localidades</SelectItem>
                {locations.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="sort-order"
              className="mb-2 text-xs text-muted-foreground"
            >
              Ordenar por
            </Label>
            <Select
              value={order}
              onValueChange={(value) => updateQuery({ ordem: value })}
            >
              <SelectTrigger
                id="sort-order"
                className="w-full rounded-full bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="nome">Nome, de A a Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="my-7 flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ListFilter className="size-4" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-foreground">
              {filtered.length}
            </strong>{" "}
            {filtered.length === 1
              ? "projeto encontrado"
              : "projetos encontrados"}
          </span>
        </p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-muted-foreground"
          >
            <X className="size-3.5" /> Limpar filtros
          </Button>
        )}
      </div>
      {filtered.length ? (
        <section aria-labelledby="results-title">
          <h2 id="results-title" className="sr-only">
            Projetos encontrados
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
            {showInvite && <InviteTile />}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center sm:p-14">
          <SearchX
            className="mx-auto mb-5 size-9 text-primary"
            strokeWidth={1.4}
          />
          <h2 className="text-2xl font-medium">
            {projects.length
              ? "Ainda não encontramos essa combinação."
              : "As próximas conexões começam aqui."}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {projects.length
              ? "Experimente outra palavra ou remova um filtro para conhecer mais projetos."
              : "Ainda não há projetos cadastrados para conhecer. Apresente sua iniciativa e ajude a construir essa rede."}
          </p>
          <Button
            asChild={!hasFilters}
            onClick={hasFilters ? reset : undefined}
            variant="outline"
            className="mt-6"
          >
            {hasFilters ? (
              "Limpar filtros"
            ) : (
              <Link href="/cadastro?tipo=project">
                Cadastrar meu projeto <ArrowRight className="size-4" />
              </Link>
            )}
          </Button>
        </div>
      )}
      {!showInvite && (
        <div className="mt-12 flex flex-col justify-between gap-5 rounded-[1.4rem] border bg-muted p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-xl font-medium">
              Seu projeto também pode estar aqui.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Compartilhe sua atuação e abra espaço para novas conexões.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/cadastro?tipo=project">
              Apresentar meu projeto <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** Ocupa o espaço ao lado de poucos resultados com um convite, sem inventar projetos. */
function InviteTile() {
  return (
    <div className="relative flex min-h-80 flex-col items-start justify-end overflow-hidden rounded-[1.4rem] border border-dashed border-primary/35 bg-muted p-7">
      <div
        aria-hidden="true"
        className="dot-pattern absolute inset-0 text-primary opacity-[.07]"
      />
      <p className="eyebrow relative">Espaço para novas histórias</p>
      <h3 className="relative mt-3 text-[1.6rem] leading-tight font-medium">
        Seu projeto também pode estar aqui.
      </h3>
      <p className="relative mt-3 mb-7 text-sm leading-relaxed text-muted-foreground">
        Compartilhe sua atuação e abra espaço para novas conexões.
      </p>
      <Button asChild className="relative">
        <Link href="/cadastro?tipo=project">
          Apresentar meu projeto <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
