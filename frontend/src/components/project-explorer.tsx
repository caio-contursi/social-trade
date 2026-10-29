"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ListFilter, Search, SearchX, X } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { areaLabels, brazilStates, compareRecentProjects, projectFilterCauseCodes } from "@/lib/catalog";
import type { Project } from "@/lib/types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function ProjectExplorer({
  projects,
  showInvite = true,
}: {
  projects: Project[];
  showInvite?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("busca") || "");
  const legacyLocation = params.get("local") || "";
  const legacyParts = legacyLocation.split("/");
  const [cause, setCause] = useState(params.get("causa") || "all");
  const [state, setState] = useState(params.get("estado") || legacyParts[1] || "");
  const [city, setCity] = useState(params.get("cidade") || (legacyParts[0] !== "all" ? legacyParts[0] : "") || "");
  const [order, setOrder] = useState(parseOrder(params.get("ordem")));
  const querySearch = params.get("busca") || "";
  const activeSearch = search;

  useEffect(() => {
    setSearch(querySearch);
  }, [querySearch]);

  useEffect(() => {
    const legacy = (params.get("local") || "").split("/");
    setCause(params.get("causa") || "all");
    setState(params.get("estado") || legacy[1] || "");
    setCity(params.get("cidade") || (legacy[0] !== "all" ? legacy[0] : "") || "");
    setOrder(parseOrder(params.get("ordem")));
  }, [params]);

  // Mantém o filtro e a URL sincronizados enquanto o termo é digitado.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const value = search.trim();
      if (value !== querySearch) updateQuery({ busca: value });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [search, querySearch]);

  function updateQuery(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    if (!Object.hasOwn(values, "causa") && cause !== "all") next.set("causa", cause);
    if (!Object.hasOwn(values, "estado") && state) next.set("estado", state);
    if (!Object.hasOwn(values, "cidade") && city) next.set("cidade", city);
    if (!Object.hasOwn(values, "ordem") && order !== "recentes") next.set("ordem", order);
    Object.entries(values).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "ordem" && value === "recentes"))
        next.delete(key);
      else next.set(key, value);
    });
    if (Object.hasOwn(values, "estado") || Object.hasOwn(values, "cidade")) {
      next.delete("local");
    }
    if (pathname === "/") next.set("explorar", "projetos");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }

  const [cities, setCities] = useState<string[]>([]);
  const [citiesUnavailable, setCitiesUnavailable] = useState(false);
  useEffect(() => {
    if (!state) {
      setCities([]);
      setCitiesUnavailable(false);
      return;
    }
    let active = true;
    setCitiesUnavailable(false);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(state)}/municipios`)
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível consultar as cidades.");
        return response.json() as Promise<{ nome: string }[]>;
      })
      .then((municipalities) => {
        if (active) {
          const names = municipalities.map((municipality) => municipality.nome).filter(Boolean);
          setCities(names.length ? names.sort((a, b) => a.localeCompare(b, "pt-BR")) : []);
          setCitiesUnavailable(names.length === 0);
        }
      })
      .catch(() => {
        if (active) {
          setCitiesUnavailable(true);
          setCities(
            [...new Set(projects.filter((project) => project.state === state).map((project) => project.city))]
              .sort((a, b) => a.localeCompare(b, "pt-BR")),
          );
        }
      });
    return () => { active = false; };
  }, [state, projects]);

  const stateOptions = useMemo(() => brazilStates.map((uf) => ({
    value: uf,
    label: `${stateNames[uf]} (${uf})`,
    keywords: uf,
  })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR")), []);
  const causeOptions = useMemo(() => projectFilterCauseCodes.map((value) => ({ value, label: areaLabels[value] })), []);
  const cityOptions = useMemo(() => {
    const names = new Set(cities);
    if (city && !names.has(city)) names.add(city);
    return [...names].map((name) => ({ value: name, label: name }));
  }, [cities, city]);
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
            (!activeSearch || text.includes(normalize(activeSearch.trim()))) &&
            (cause === "all" || project.areas.includes(cause)) &&
            (!state || project.state === state) &&
            (!city || normalize(project.city) === normalize(city)) &&
            matchesPaymentOption(project, order)
          );
        })
        .sort((a, b) => compareProjects(a, b, order)),
    [projects, activeSearch, cause, state, city, order],
  );
  const hasFilters = !!activeSearch.trim() || cause !== "all" || !!state || !!city || ["pix", "sol", "ambos"].includes(order);

  function reset() {
    setSearch("");
    setCause("all");
    setState("");
    setCity("");
    setOrder("recentes");
    setCities([]);
    router.replace(pathname === "/" ? "/?explorar=projetos" : pathname, { scroll: false });
  }

  return (
    <div>
      <div data-filter-card className="public-card rounded-[1.5rem] border p-4 text-[var(--surface-green-foreground)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
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
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SearchableSelect
            id="cause-filter"
            label="Causa"
            value={cause === "all" ? "" : cause}
            options={causeOptions}
            placeholder="Todas as causas"
            searchPlaceholder="Digite para buscar uma causa"
            onValueChange={(value) => {
              const next = value || "all";
              setCause(next);
              updateQuery({ causa: next });
            }}
          />
          <SearchableSelect
            id="state-filter"
            label="Estado"
            value={state}
            options={stateOptions}
            placeholder="Todos os estados"
            searchPlaceholder="Digite o nome ou a sigla do estado"
            onValueChange={(value) => {
              setState(value);
              setCity("");
              updateQuery({ estado: value, cidade: "" });
            }}
          />
          <SearchableSelect
            id="location-filter"
            label="Cidade"
            value={city}
            options={cityOptions}
            placeholder="Todas as cidades"
            searchPlaceholder="Digite para buscar uma cidade"
            disabled={!state}
            onValueChange={(value) => {
              setCity(value);
              updateQuery({ cidade: value });
            }}
          />
          <SearchableSelect
            id="sort-order"
            label="Ordenar por"
            value={order}
            options={sortOptions}
            placeholder="Selecione a ordem"
            searchPlaceholder="Digite para localizar uma opção"
            onValueChange={(value) => {
              const next = value || "recentes";
              setOrder(next);
              updateQuery({ ordem: next });
            }}
          />
        </div>
        {citiesUnavailable && state && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            Não foi possível carregar todas as cidades agora. Exibindo as localidades dos projetos encontrados.
          </p>
        )}
      </div>
      <div className="my-7 flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-[var(--forest-muted)]"
        >
          <ListFilter className="size-4" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-[var(--forest-foreground)]">
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
            className="text-[var(--forest-muted)]"
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
          </div>
        </section>
      ) : (
        <div className="public-card rounded-[1.5rem] border border-dashed p-8 text-center text-[var(--surface-green-foreground)] sm:p-14">
          <SearchX
            className="mx-auto mb-5 size-9 text-primary"
            strokeWidth={1.4}
          />
          <h2 className="text-2xl font-medium">
            {projects.length
              ? "Ainda não encontramos essa combinação."
              : "As próximas conexões começam aqui."}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--surface-green-muted)]">
            {projects.length
              ? "Experimente outra palavra ou remova um filtro para conhecer mais projetos."
              : "Ainda não há projetos cadastrados para conhecer. Apresente sua iniciativa e ajude a construir essa rede."}
          </p>
          {(hasFilters || showInvite) && (
            <Button
              asChild={!hasFilters}
              onClick={hasFilters ? reset : undefined}
              variant="outline"
              className="mt-6"
            >
              {hasFilters ? (
                "Limpar filtros"
              ) : (
                <Link data-route-transition href="/cadastro?tipo=project">
                  Cadastrar meu projeto <ArrowRight className="size-4" />
                </Link>
              )}
            </Button>
          )}
        </div>
      )}
      {showInvite && filtered.length > 0 && <ProjectInvite />}
    </div>
  );
}

export function ProjectInvite() {
  return (
    <section id="meu-projeto" aria-label="Cadastre seu projeto" className="public-card relative mt-10 flex scroll-mt-24 flex-col justify-between gap-7 overflow-hidden rounded-[1.5rem] border px-6 py-8 text-[var(--surface-green-foreground)] sm:mt-12 sm:flex-row sm:items-center sm:px-10 sm:py-10">
      <div
        aria-hidden="true"
        className="dot-pattern pointer-events-none absolute inset-0 text-primary opacity-[.055]"
      />
      <div className="relative max-w-2xl">
        <p className="mb-2 text-xs font-semibold tracking-[.16em] text-[var(--surface-green-accent)] uppercase">Para projetos sociais</p>
        <h2 className="font-display text-2xl leading-tight font-medium sm:text-3xl">
          Sua iniciativa pode transformar ainda mais histórias.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--surface-green-muted)] sm:text-base">
          Apresente seu trabalho, conte seus objetivos e aproxime pessoas e empresas que querem apoiar boas causas.
        </p>
      </div>
      <Button asChild variant="energy" size="lg" className="relative w-full shrink-0 sm:w-auto">
        <Link data-route-transition href="/cadastro?tipo=project">
          Apresentar meu projeto <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  );
}

const stateNames: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

const sortOptions = [
  { value: "recentes", label: "Projetos recentemente adicionados" },
  { value: "nome_az", label: "Nome, de A a Z" },
  { value: "nome_za", label: "Nome, de Z a A" },
  { value: "alta", label: "Projetos em alta" },
  { value: "pix", label: "Apenas Pix" },
  { value: "sol", label: "Apenas SOL" },
  { value: "ambos", label: "Pix e SOL" },
];

function parseOrder(value: string | null) {
  if (value === "nome") return "nome_az";
  return sortOptions.some((option) => option.value === value) ? value! : "recentes";
}

function matchesPaymentOption(project: Project, order: string) {
  if (order === "pix") return Boolean(project.pix_donations_available && !project.sol_donations_available);
  if (order === "sol") return Boolean(project.sol_donations_available && !project.pix_donations_available);
  if (order === "ambos") return Boolean(project.pix_donations_available && project.sol_donations_available);
  return true;
}

function compareProjects(a: Project, b: Project, order: string) {
  if (order === "nome_az") return a.name.localeCompare(b.name, "pt-BR");
  if (order === "nome_za") return b.name.localeCompare(a.name, "pt-BR");
  if (order === "alta") return publicProfileSignal(b) - publicProfileSignal(a)
    || compareRecentProjects(a, b);
  return compareRecentProjects(a, b);
}

/** “Em alta” uses only profile information already public; private trust or donation data never enters discovery ranking. */
function publicProfileSignal(project: Project) {
  return (project.profile_completeness || 0)
    + (project.objective ? 1 : 0)
    + (project.impact_summary ? 1 : 0)
    + (project.description ? 1 : 0)
    + (project.logo_url ? 1 : 0)
    + (project.website_url ? 1 : 0)
    + (project.instagram_url ? 1 : 0);
}
