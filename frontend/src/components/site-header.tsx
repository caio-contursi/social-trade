"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Headset, Menu } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { scrollToSection } from "@/lib/scroll-to-section";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { user } = useAuth();
  const [exploring, setExploring] = useState(false);
  useEffect(() => {
    const update = (event: Event) => setExploring((event as CustomEvent<boolean>).detail);
    window.addEventListener("socialtrade:explore-projects", update);
    return () => window.removeEventListener("socialtrade:explore-projects", update);
  }, []);
  useEffect(() => setExploring(false), [pathname]);
  const links = isLanding
    ? exploring
      ? [
          { href: "#projetos", label: "Procurar projeto/instituição" },
          { href: "#meu-projeto", label: "Meu projeto" },
        ]
      : [
          { href: "/#quem-somos", label: "Quem somos" },
          { href: "/#como-funciona", label: "Como funciona" },
          { href: "/#transparencia", label: "Transparência" },
        ]
    : [
        { href: "/?explorar=projetos", label: "Procurar projeto/instituição" },
        { href: "/#como-funciona", label: "Como funciona" },
        { href: "/#transparencia", label: "Transparência" },
      ];
  return (
    <header className="site-header-frost sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="page-container relative grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-3 lg:gap-6">
        <Link
          href="/"
          onClick={isLanding && exploring ? (event) => {
            event.preventDefault();
            window.history.replaceState(window.history.state, "", "/");
            window.dispatchEvent(new CustomEvent("socialtrade:show-home"));
          } : undefined}
          transitionTypes={pathname === "/projetos" ? ["discovery-back"] : undefined}
          aria-label="SocialTrade, início"
        >
          <Brand />
        </Link>
        <nav
          aria-label="Navegação principal"
          className="hidden min-w-0 items-center justify-center gap-4 text-[13px] xl:flex xl:gap-6"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={isLanding && link.href.startsWith("/#") ? (event) => {
                event.preventDefault();
                const sectionId = link.href.slice(2);
                window.history.pushState(window.history.state, "", link.href);
                const target = document.getElementById(sectionId);
                if (target) scrollToSection(target);
              } : isLanding && link.href.startsWith("#") ? (event) => {
                event.preventDefault();
                window.history.pushState(window.history.state, "", link.href);
                const target = document.getElementById(link.href.slice(1));
                if (target) scrollToSection(target);
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
                "site-nav-link rounded-sm py-1 whitespace-nowrap underline-offset-[6px] decoration-energy decoration-2 transition-colors hover:text-foreground",
                pathname === link.href
                  ? "font-semibold text-foreground underline"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
          {isLanding && exploring && <ComingSoonMenuItem />}
        </nav>
        <div className="col-start-3 flex items-center justify-self-end gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link data-route-transition href={user ? "/painel/suporte" : "/entrar?proximo=%2Fpainel%2Fsuporte"}>
              <Headset className="size-4" /> Suporte
            </Link>
          </Button>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link data-route-transition href={user ? "/painel" : "/entrar"}>
              {user ? "Meu painel" : "Entrar"}
            </Link>
          </Button>
          {(!user || (isLanding && !exploring)) && <Button asChild className="hidden sm:inline-flex">
            <Link data-route-transition={!user ? "" : undefined} href={user ? "/?explorar=projetos#projetos" : "/cadastro"} onClick={user ? (event) => {
              event.preventDefault();
              window.history.replaceState(window.history.state, "", "/?explorar=projetos#projetos");
              setExploring(true);
              window.dispatchEvent(new CustomEvent("socialtrade:open-projects"));
            } : undefined}>
              {user ? "Explorar projetos" : "Fazer cadastro"}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="xl:hidden"
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
                      if (isLanding && (link.href.startsWith("/#") || link.href.startsWith("#"))) {
                        event.preventDefault();
                        const sectionId = link.href.startsWith("/#") ? link.href.slice(2) : link.href.slice(1);
                        window.history.pushState(window.history.state, "", link.href);
                        const scrollToTarget = () => {
                          const target = document.getElementById(sectionId);
                          if (target) scrollToSection(target);
                        };
                        if (open) window.setTimeout(scrollToTarget, 350);
                        else scrollToTarget();
                      } else if (isLanding && exploring && link.label === "Início") {
                        event.preventDefault();
                        window.dispatchEvent(new CustomEvent("socialtrade:explore-projects", { detail: false }));
                      }
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                {isLanding && exploring && <ComingSoonMenuItem mobile onClick={() => setOpen(false)} />}
                {user && !isLanding && (
                  <Link
                    data-route-transition
                    className="rounded-xl px-3 py-4 font-display text-xl hover:bg-accent"
                    href="/painel/suporte"
                    onClick={() => setOpen(false)}
                  >
                    <Headset className="mr-2 inline size-4" aria-hidden="true" />
                    Suporte
                  </Link>
                )}
                {!isLanding && <Button asChild variant="outline" className="mt-5">
                  <Link
                    data-route-transition
                    href={user ? "/painel" : "/entrar"}
                    onClick={() => setOpen(false)}
                  >
                    {user ? "Meu painel" : "Entrar na conta"}
                  </Link>
                </Button>}
                {!isLanding && <Button asChild>
                  <Link data-route-transition href="/cadastro" onClick={() => setOpen(false)}>
                    Fazer parte
                  </Link>
                </Button>}
                {isLanding && (!user || !exploring) && (
                  <>
                    <Link
                      data-route-transition
                      className="rounded-xl px-3 py-4 font-display text-xl hover:bg-accent"
                      href={user ? "/painel/suporte" : "/entrar?proximo=%2Fpainel%2Fsuporte"}
                      onClick={() => setOpen(false)}
                    >
                      <Headset className="mr-2 inline size-4" aria-hidden="true" />
                      Suporte
                    </Link>
                    <Button asChild variant="outline" className="mt-3">
                      <Link data-route-transition href={user ? "/painel" : "/entrar"} onClick={() => setOpen(false)}>
                        {user ? "Meu painel" : "Entrar"}
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link data-route-transition={!user ? "" : undefined} href={user ? "/?explorar=projetos#projetos" : "/cadastro"} onClick={(event) => {
                        setOpen(false);
                        if (user) {
                          event.preventDefault();
                          window.history.replaceState(window.history.state, "", "/?explorar=projetos#projetos");
                          setExploring(true);
                          window.dispatchEvent(new CustomEvent("socialtrade:open-projects"));
                        }
                      }}>
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

    </header>
  );
}

function ComingSoonMenuItem({
  mobile = false,
  onClick,
}: {
  mobile?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href="#encontre-sua-causa"
      onClick={(event) => {
        onClick?.();
        if (window.location.pathname !== "/") return;
        const target = document.getElementById("encontre-sua-causa");
        if (!target) return;
        event.preventDefault();
        window.history.pushState(window.history.state, "", "#encontre-sua-causa");
        const scroll = () => scrollToSection(target);
        if (mobile) window.setTimeout(scroll, 350);
        else scroll();
      }}
      aria-label="Encontre sua causa"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        mobile && "justify-between rounded-xl px-3 py-4 font-display text-xl transition-colors hover:bg-accent",
        !mobile && "whitespace-nowrap py-1 text-[13px]",
      )}
    >
      <span>Faça o quiz de causas</span>
    </Link>
  );
}
