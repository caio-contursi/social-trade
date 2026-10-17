"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  Compass,
  HeartHandshake,
  Leaf,
  LifeBuoy,
  LockKeyhole,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/catalog";
import type {
  Announcement,
  Membership,
  Organization,
  Ticket,
} from "@/lib/types";
import {
  EmptyState,
  useWorkspaceResource,
  WorkspaceError,
  WorkspaceHeading,
  WorkspaceLoading,
} from "./shared";

export function Dashboard() {
  const { user } = useAuth();
  const organizations = useWorkspaceResource<Organization[]>(
    "/api/organizations/mine",
  );
  const memberships = useWorkspaceResource<Membership[]>(
    "/api/memberships/mine",
  );
  const announcements =
    useWorkspaceResource<Announcement[]>("/api/announcements");
  const tickets = useWorkspaceResource<Ticket[]>("/api/support/mine");
  if (!user) return null;
  const resources = [organizations, memberships, announcements, tickets];
  const failed = resources.find((resource) => resource.error);
  if (failed?.error)
    return (
      <WorkspaceError
        message={failed.error}
        retry={() => resources.forEach((resource) => resource.reload())}
      />
    );
  if (resources.some((resource) => resource.loading))
    return <WorkspaceLoading />;
  const orgs = organizations.data || [];
  const links = memberships.data || [];
  const notices = announcements.data || [];
  const pendingTickets = (tickets.data || []).filter(
    (ticket) => ticket.status !== "resolved",
  ).length;
  const isPerson = user.account_type === "person";
  const isDonor = user.account_type === "donor";
  const mainOrg = orgs[0];
  const incomplete = orgs.find((org) => (org.profile_completeness ?? 0) < 100);
  const orgLabel = isDonor
    ? "Minha empresa"
    : isPerson
      ? "Meus vínculos"
      : "Meus projetos";
  const stats = [
    {
      label: isPerson
        ? "Vínculos com projetos"
        : isDonor
          ? "Empresa cadastrada"
          : "Projetos cadastrados",
      value: isPerson ? links.length : orgs.length,
      icon: isPerson ? HeartHandshake : Building2,
      href: "/painel/organizacoes",
    },
    {
      label: "Avisos da plataforma",
      value: notices.length,
      icon: Bell,
      href: "/painel/avisos",
    },
    {
      label: "Solicitações em aberto",
      value: pendingTickets,
      icon: LifeBuoy,
      href: "/painel/suporte",
    },
  ];
  return (
    <>
      <WorkspaceHeading
        eyebrow="Visão geral"
        title={`Olá, ${user.full_name.split(" ")[0]}.`}
        description={
          isDonor
            ? "O próximo impacto começa com uma boa conexão. Encontre projetos e conheça quem está por trás de cada iniciativa."
            : "Seu espaço para cuidar das informações, acompanhar novidades e fortalecer conexões."
        }
      />
      <section className="ink-panel relative overflow-hidden rounded-[1.75rem] px-6 py-8 sm:p-10 dark:ring-1 dark:ring-white/10">
        <div
          aria-hidden="true"
          className="dot-pattern pointer-events-none absolute -top-16 -right-16 flex size-72 items-center justify-center rounded-full opacity-90 [background-size:14px_14px] text-white/[.07]"
        >
          <Leaf className="size-28 rotate-12 text-energy/25" />
        </div>
        <div className="relative max-w-xl">
          <p className="eyebrow mb-4">Pequenos passos. Novas possibilidades.</p>
          <h2 className="text-[1.75rem] leading-tight font-medium sm:text-[2.1rem]">
            {isDonor
              ? "Encontre uma causa que se conecta com a sua empresa."
              : isPerson
                ? "Você também faz parte da transformação."
                : "Conte a sua história. Aproxime novos apoiadores."}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-foreground/80">
            {isDonor
              ? "Conheça a atuação, os objetivos e os resultados compartilhados pelos projetos antes de dar o próximo passo."
              : isPerson
                ? "Acompanhe os projetos aos quais você está vinculado e mantenha seus dados atualizados."
                : "Um perfil claro ajuda as pessoas a entenderem o seu trabalho, suas necessidades e o impacto que você busca."}
          </p>
          <Button asChild variant="energy" className="mt-7">
            <Link href={isDonor ? "/projetos" : "/painel/organizacoes"}>
              {isDonor
                ? "Explorar projetos"
                : isPerson
                  ? "Ver meus vínculos"
                  : "Cuidar dos meus projetos"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
      <div className="my-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group flex items-start justify-between gap-3 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md"
          >
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-3 font-display text-4xl font-medium tabular-nums">
                {stat.value}
              </p>
            </div>
            <stat.icon className="mt-1 size-5 text-primary" />
            <ArrowUpRight className="mt-auto size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="surface">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Seu próximo passo</h2>
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary">
              <Compass className="size-4 text-primary" />
            </span>
          </div>
          {isPerson ? (
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {links.length > 0
                  ? "Os seus vínculos estão disponíveis em um só lugar. Consulte o projeto e o tipo de participação informado no seu cadastro."
                  : "Você ainda não tem vínculos com projetos. Explore as iniciativas e fale com o suporte se precisar corrigir seu cadastro."}
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link
                  href={links.length ? "/painel/organizacoes" : "/projetos"}
                >
                  {links.length ? "Consultar vínculos" : "Conhecer iniciativas"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : !mainOrg ? (
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isDonor
                  ? "Não encontramos uma empresa vinculada à sua conta. O suporte pode ajudar a regularizar seu cadastro."
                  : "Apresente a primeira iniciativa e deixe claro o que o seu projeto faz e quem ele atende."}
              </p>
              <Button asChild className="mt-5">
                <Link
                  href={isDonor ? "/painel/suporte" : "/painel/organizacoes"}
                >
                  {isDonor ? "Falar com o suporte" : "Cadastrar projeto"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">{(incomplete || mainOrg).name}</p>
                {(incomplete || mainOrg).is_demo && (
                  <Badge variant="outline">Demonstração</Badge>
                )}
              </div>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  Preenchimento do perfil
                </span>
                <span className="font-semibold">
                  {(incomplete || mainOrg).profile_completeness ?? 0}%
                </span>
              </div>
              <Progress
                value={(incomplete || mainOrg).profile_completeness ?? 0}
                aria-label="Preenchimento do perfil"
                className="h-2"
              />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {incomplete
                  ? "Complete a história, os objetivos e os canais de contato para facilitar novas conexões."
                  : "As informações principais foram preenchidas. Revise o perfil sempre que houver novidades."}
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/painel/organizacoes">
                  {incomplete ? "Completar informações" : orgLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
          <div className="mt-7 flex items-start gap-3 border-t pt-5">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">
                Mantenha sua conta por perto
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Confirme seus dados de contato para facilitar o atendimento.
              </p>
              <Link
                href="/painel/perfil"
                className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Revisar minha conta
              </Link>
            </div>
          </div>
        </section>
        <section className="surface">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-medium">Da comunidade</h2>
            <Link
              href="/painel/avisos"
              className="whitespace-nowrap text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Todos os avisos
            </Link>
          </div>
          {notices.length ? (
            <div className="space-y-5">
              {notices.slice(0, 3).map((notice) => (
                <article
                  key={notice.id}
                  className="border-b pb-5 last:border-0 last:pb-0"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {notice.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={notice.published_at}>
                      {formatDate(notice.published_at)}
                    </time>
                  </div>
                  <Link
                    href="/painel/avisos"
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {notice.title}
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {notice.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum aviso por enquanto"
              description="As novidades da plataforma aparecerão aqui quando forem publicadas."
              icon={<Bell className="size-6" />}
            />
          )}
        </section>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-muted/50 p-5">
        <LockKeyhole className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Transparência, passo a passo</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Os perfis apresentam informações declaradas pelos responsáveis.
            Doações com registro na Solana e prestação de contas serão
            integradas em uma próxima etapa; ainda não há movimentação de
            recursos pela plataforma.
          </p>
        </div>
      </div>
    </>
  );
}
