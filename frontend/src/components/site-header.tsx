"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, LifeBuoy, Menu } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import type { Organization } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { user, token } = useAuth();
  const [exploring, setExploring] = useState(false);
  const [myProject, setMyProject] = useState<Organization | null>(null);
  useEffect(() => {
    const update = (event: Event) => setExploring((event as CustomEvent<boolean>).detail);
    window.addEventListener("socialtrade:explore-projects", update);
    return () => window.removeEventListener("socialtrade:explore-projects", update);
  }, []);
  useEffect(() => setExploring(false), [pathname]);
  useEffect(() => {
    if (!user || user.account_type !== "project" || !token) {
      setMyProject(null);
      return;
    }
    let active = true;
    api<Organization[]>("/api/organizations/mine", { token })
      .then((organizations) => {
        if (active) setMyProject(organizations.find((org) => org.institution_kind === "project") || null);
      })
      .catch(() => { if (active) setMyProject(null); });
    return () => { active = false; };
  }, [user, token]);

  const myProjectHref = myProject
    ? `/projetos/${encodeURIComponent(myProject.slug)}#conteudo`
    : "/cadastro?tipo=project";
  const links = isLanding
    ? exploring
      ? [
          { href: "#projetos", label: "Encontrar projeto" },
          { href: myProjectHref, label: "Meu projeto" },
        ]
      : [
          { href: "/#quem-somos", label: "Quem somos" },
          { href: "/#como-funciona", label: "Como funciona" },
          { href: "/#transparencia", label: "Transparência" },
        ]
    : [
        { href: "/projetos", label: "Explorar projetos" },
        { href: "/#como-funciona", label: "Como funciona" },
        { href: "/#transparencia", label: "Transparência" },
      ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="page-container flex h-[4.5rem] items-center justify-between gap-6">
        <Link
          href="/"
          onClick={isLanding && exploring ? (event) => {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("socialtrade:show-home"));
          } : undefined}
          transitionTypes={pathname === "/projetos" ? ["discovery-back"] : undefined}
          aria-label="SocialTrade, início"
        >
          <Brand />
        </Link>
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-8 text-sm md:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={isLanding && !exploring && link.href.startsWith("/#") ? (event) => {
                event.preventDefault();
                const sectionId = link.href.slice(2);
                window.history.pushState(window.history.state, "", link.href);
                document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
              } : isLanding && link.label === "Explorar projetos" ? (event) => {
                event.preventDefault();
                window.history.replaceState(window.history.state, "", "/");
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                window.dispatchEvent(new CustomEvent("socialtrade:open-projects"));
              } : isLanding && exploring && link.label === "Início" ? (event) => {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: false }));
              } : undefined}
              transitionTypes={
                pathname === "/projetos"
                  ? ["discovery-back"]
                  : undefined
              }
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "rounded-sm py-1 underline-offset-[6px] decoration-energy decoration-2 transition-colors hover:text-foreground hover:underline",
                pathname === link.href
                  ? "font-semibold text-foreground underline"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href={user ? "/painel/suporte" : "/entrar?proximo=%2Fpainel%2Fsuporte"}>
              <LifeBuoy className="size-4" /> Suporte
            </Link>
          </Button>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={user ? "/painel" : "/entrar"}>
              {user ? "Meu painel" : "Entrar"}
            </Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href={user ? "/projetos#conteudo" : "/cadastro"}>
              {user ? "Explorar projetos" : "Fazer cadastro"}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="md:hidden"
                aria-label="Abrir navegação"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Explore a SocialTrade</SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Navegação móvel"
                className="flex flex-col gap-2 px-5 py-6"
              >
                {links.map((link) => (
                  <Link
                    key={link.href}
                    className="rounded-xl px-3 py-4 font-display text-xl hover:bg-accent"
                    href={link.href}
                    onClick={(event) => {
                      setOpen(false);
                      if (isLanding && !exploring && link.href.startsWith("/#")) {
                        event.preventDefault();
                        const sectionId = link.href.slice(2);
                        window.history.pushState(window.history.state, "", link.href);
                        const scrollToSection = () => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        if (open) window.setTimeout(scrollToSection, 350);
                        else scrollToSection();
                      } else if (isLanding && link.label === "Explorar projetos") {
                        event.preventDefault();
                        window.history.replaceState(window.history.state, "", "/");
                        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                        window.dispatchEvent(new CustomEvent("socialtrade:open-projects"));
                      } else if (isLanding && exploring && link.label === "Início") {
                        event.preventDefault();
                        window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: false }));
                      }
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                {user && !isLanding && (
                  <Link
                    className="rounded-xl px-3 py-4 font-display text-xl hover:bg-accent"
                    href="/painel/suporte"
                    onClick={() => setOpen(false)}
                  >
                    Suporte
                  </Link>
                )}
                {!isLanding && <Button asChild variant="outline" className="mt-5">
                  <Link
                    href={user ? "/painel" : "/entrar"}
                    onClick={() => setOpen(false)}
                  >
                    {user ? "Meu painel" : "Entrar na conta"}
                  </Link>
                </Button>}
                {!isLanding && <Button asChild>
                  <Link href="/cadastro" onClick={() => setOpen(false)}>
                    Fazer parte
                  </Link>
                </Button>}
                {isLanding && (
                  <>
                    <Link
                      className="rounded-xl px-3 py-4 font-display text-xl hover:bg-accent"
                      href={user ? "/painel/suporte" : "/entrar?proximo=%2Fpainel%2Fsuporte"}
                      onClick={() => setOpen(false)}
                    >
                      Suporte
                    </Link>
                    <Button asChild variant="outline" className="mt-3">
                      <Link href={user ? "/painel" : "/entrar"} onClick={() => setOpen(false)}>
                        {user ? "Meu painel" : "Entrar"}
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href={user ? "/projetos#conteudo" : "/cadastro"} onClick={() => setOpen(false)}>
                        {user ? "Explorar projetos" : "Fazer cadastro"}
                      </Link>
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {isLanding && exploring && (
        <nav aria-label="Navegação de projetos" className="page-container grid grid-cols-2 gap-2 border-t py-2 md:hidden">
          <Link href="#projetos" className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-accent">
            Encontrar projeto
          </Link>
          <Link href={myProjectHref} className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-accent">
            Meu projeto
          </Link>
        </nav>
      )}
    </header>
  );
}
