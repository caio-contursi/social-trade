"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  Building2,
  Compass,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
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
import { WorkspaceError, WorkspaceLoading } from "./shared";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, retrySession, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!loading && !error && !user)
      router.replace(`/entrar?proximo=${encodeURIComponent(pathname)}`);
  }, [loading, error, user, router, pathname]);
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
  const items = [
    { href: "/painel", label: "Visão geral", icon: LayoutDashboard },
    { href: "/projetos", label: "Explorar projetos", icon: Compass },
    {
      href: "/painel/organizacoes",
      label: organizationLabel,
      icon: user.account_type === "person" ? HeartHandshake : Building2,
    },
    { href: "/painel/avisos", label: "Avisos", icon: Bell },
    { href: "/painel/perfil", label: "Minha conta", icon: UserRound },
    { href: "/painel/suporte", label: "Suporte", icon: LifeBuoy },
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
      <p className="mb-3 px-3 text-[11px] font-semibold tracking-[.16em] text-muted-foreground uppercase">
        Seu espaço
      </p>
      <nav aria-label="Navegação do painel" className="space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/painel"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <item.icon className="size-[18px] shrink-0" />
              {item.label}
              {item.href === "/projetos" && (
                <ArrowUpRight className="ml-auto size-3.5 opacity-65" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-8">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">
            Conexões que fazem a diferença.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Um espaço para aproximar quem quer apoiar de quem transforma.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={signOut}
          className="mt-4 w-full justify-start gap-3 text-muted-foreground"
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
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r bg-sidebar px-4 py-7 lg:flex">
        {navigation}
      </aside>
      <div className="lg:pl-64">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b bg-card px-5 sm:px-8 lg:px-10">
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
                className="flex w-[min(85vw,300px)] flex-col overflow-y-auto bg-sidebar p-5"
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
              <p className="max-w-44 truncate text-sm font-semibold sm:max-w-sm">
                {user.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/painel/perfil"
              className="ml-1 flex size-10 items-center justify-center rounded-full border bg-secondary text-sm font-semibold"
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
            className="underline-offset-4 hover:underline"
            href="/painel/suporte"
          >
            Precisa de ajuda?
          </Link>
        </footer>
      </div>
    </div>
  );
}
