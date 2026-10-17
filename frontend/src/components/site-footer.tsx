import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowUpRight } from "lucide-react";
export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="page-container grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="SocialTrade, início">
            <Brand />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Boas conexões movem boas causas.
            <br />
            Uma rede para aproximar quem quer apoiar de quem faz acontecer.
          </p>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold">Faça parte da rede</p>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <Link href="/projetos" className="hover:text-primary">
              Encontre um projeto
            </Link>
            <Link href="/cadastro?tipo=donor" className="hover:text-primary">
              Cadastre sua empresa
            </Link>
            <Link href="/cadastro?tipo=project" className="hover:text-primary">
              Apresente seu projeto
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold">Vamos começar?</p>
          <Link
            href="/entrar"
            className="inline-flex items-center gap-2 text-sm text-primary"
          >
            Acesse sua conta
            <ArrowUpRight className="size-4" />
          </Link>
          <p className="mt-5 text-xs leading-6 text-muted-foreground">
            Perfis e resultados são informados pelas organizações. Conheça os
            detalhes antes de apoiar.
          </p>
        </div>
      </div>
      <div className="page-container flex flex-wrap justify-between gap-3 border-t py-5 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} SocialTrade</span>
        <span>Conexões com propósito.</span>
      </div>
    </footer>
  );
}
