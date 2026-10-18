"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
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
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const links = [
    { href: "/projetos", label: "Explorar projetos" },
    { href: "/#como-funciona", label: "Como funciona" },
    { href: "/#transparencia", label: "Transparência" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="page-container flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" aria-label="SocialTrade, início">
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
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={user ? "/painel" : "/entrar"}>
              {user ? "Meu painel" : "Entrar"}
            </Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href={user ? "/projetos" : "/cadastro"}>
              {user ? "Explorar projetos" : "Fazer parte"}
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
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button asChild variant="outline" className="mt-5">
                  <Link
                    href={user ? "/painel" : "/entrar"}
                    onClick={() => setOpen(false)}
                  >
                    {user ? "Meu painel" : "Entrar na conta"}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/cadastro" onClick={() => setOpen(false)}>
                    Fazer parte
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
