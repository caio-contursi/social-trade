"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  Building2,
  Compass,
  HandCoins,
  HeartHandshake,
  LayoutDashboard,
  Headset,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Announcement } from "@/lib/types";
import { useWorkspaceResource, WorkspaceError, WorkspaceLoading } from "./shared";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, retrySession, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const announcements = useWorkspaceResource<Announcement[]>("/api/announcements");
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const userId = user?.id;
  useEffect(() => {
    if (!loading && !error && !user)
      router.replace(`/entrar?proximo=${encodeURIComponent(pathname)}`);
  }, [loading, error, user, router, pathname]);
  useEffect(() => {
    if (!userId || !announcements.data) return;
    const storageKey = `socialtrade-read-announcements-${userId}`;
    let readIds: number[] = [];
    try {
      readIds = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as number[];
    } catch {
      readIds = [];
    }
    if (pathname === "/painel/avisos") {
      const nextReadIds = [...new Set([...readIds, ...announcements.data.map((notice) => notice.id)])];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextReadIds));
      } catch {
        // A indisponibilidade do armazenamento local não deve bloquear os avisos.
      }
      setUnreadAnnouncements(0);
      return;
    }
    const read = new Set(readIds);
    setUnreadAnnouncements(announcements.data.filter((notice) => !read.has(notice.id)).length);
  }, [announcements.data, pathname, userId]);
  if (error)
    return (
      <main id="conteudo" className="page-container py-16">
        <WorkspaceError message={error} retry={() => void retrySession()} />
      </main>
    );
  if (loading || !user)
    return (
      <main id="conteudo" className="page-container py-16">
        <WorkspaceLoading />
      </main>
    );
  const organizationLabel =
    user.account_type === "donor"
      ? "Minha empresa"
      : user.account_type === "person"
        ? "Meus vínculos"
        : "Meus projetos";
  const organizationItem = user.account_type === "project"
    ? { href: "/painel/meu-projeto", label: "Meu projeto", icon: Building2 }
    : {
        href: "/painel/organizacoes",
        label: organizationLabel,
        icon: user.account_type === "person" ? HeartHandshake : Building2,
      };
  const items = [
    { href: "/painel", label: "Visão geral", icon: LayoutDashboard },
    { href: "/?explorar=projetos#projetos", label: "Explorar projetos", icon: Compass },
    { href: "/painel/doacoes", label: "Doações", icon: HandCoins },
    organizationItem,
    { href: "/painel/avisos", label: "Avisos", icon: Bell },
    { href: "/painel/perfil", label: "Minha conta", icon: UserRound },
    { href: "/painel/suporte", label: "Suporte", icon: Headset },
    ...(user.role === "moderator"
      ? [{ href: "/painel/moderacao", label: "Moderação", icon: ShieldCheck }]
      : []),
  ];
  function signOut() {
    logout();
    router.replace("/entrar");
  }
  const navigation = (
    <>
      <div className="px-3 pb-7 pt-2">
        <Link
          href="/"
          aria-label="SocialTrade, início"
          onClick={() => setMenuOpen(false)}
        >
          <Brand />
        </Link>
      </div>
      <p className="mb-3 px-3 text-[11px] font-semibold tracking-[.16em] text-sidebar-foreground/70 uppercase">
        Seu espaço
      </p>
      <nav aria-label="Navegação do painel" className="space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/painel"
              ? pathname === item.href
              : item.href.includes("explorar=projetos")
                ? false
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-route-transition={item.label === "Suporte" || item.label === "Explorar projetos" ? true : undefined}
              onClick={() => setMenuOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors ${active ? "bg-energy font-semibold text-energy-foreground shadow-sm" : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"}`}
            >
              <item.icon className="size-[18px] shrink-0" />
              {item.label}
              {item.href === "/painel/avisos" && unreadAnnouncements > 0 && (
                <span
                  className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white"
                  aria-label={`${unreadAnnouncements} ${unreadAnnouncements === 1 ? "aviso não lido" : "avisos não lidos"}`}
                >
                  {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
                </span>
              )}
              {item.href.includes("explorar=projetos") && (
                <ArrowUpRight className="ml-auto size-3.5 opacity-65" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-8">
        <Button
          type="button"
          variant="ghost"
          onClick={signOut}
          className="mt-4 w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
        >
          <LogOut className="size-4" />
          Sair da conta
        </Button>
      </div>
    </>
  );
  const accountLabel =
    user.role === "moderator"
      ? "Moderação"
      : user.account_type === "donor"
        ? "Empresa apoiadora"
        : user.account_type === "project"
          ? "Projeto social"
          : "Pessoa física";
  return (
    <div className="workspace-app min-h-screen bg-background">
      <aside className="on-ink fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto bg-sidebar px-4 py-7 text-sidebar-foreground lg:flex">
        {navigation}
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-[4.5rem] items-center justify-between gap-4 border-b bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 lg:hidden"
                  aria-label="Abrir menu do painel"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="on-ink flex w-[min(85vw,300px)] flex-col overflow-y-auto border-none bg-sidebar p-5 text-sidebar-foreground [&>button]:data-[state=open]:bg-white/10"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu do painel</SheetTitle>
                  <SheetDescription>
                    Acesse as áreas da sua conta SocialTrade.
                  </SheetDescription>
                </SheetHeader>
                {navigation}
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-xs text-muted-foreground">{accountLabel}</p>
              <p className="max-w-44 truncate font-display text-base font-medium sm:max-w-sm">
                {user.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/painel/perfil"
              className="ml-1 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-label="Abrir minha conta"
            >
              {user.full_name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </Link>
          </div>
        </header>
        <main
          id="conteudo"
          className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pb-8 pt-3 text-xs text-muted-foreground sm:px-8 lg:px-10">
          <span>SocialTrade · Juntos, o impacto vai mais longe.</span>
          <Link
            className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
            href="/painel/suporte"
          >
            <Headset className="size-4" aria-hidden="true" />
            Precisa de ajuda?
          </Link>
        </footer>
      </div>
    </div>
  );
}
