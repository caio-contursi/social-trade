import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { OpenProjectsLink } from "@/components/open-projects-link";

const linkClass =
  "rounded-sm text-ink-foreground/80 underline-offset-4 decoration-energy hover:text-ink-foreground hover:underline";

export function SiteFooter() {
  return (
    <footer className="ink-panel">
      <div className="page-container grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            aria-label="SocialTrade, início"
            className="inline-block rounded-sm"
          >
            <Brand />
          </Link>
          <p className="mt-5 max-w-xs font-display text-xl leading-snug font-medium">
            Boas conexões movem boas causas.
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-ink-foreground/75">
            Uma rede para aproximar quem quer apoiar de quem faz acontecer.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Faça parte da rede</p>
          <div className="flex flex-col gap-3 text-sm">
            <OpenProjectsLink className={linkClass}>
              Encontre um projeto
            </OpenProjectsLink>
            <Link href="/cadastro?tipo=donor" className={linkClass}>
              Cadastre sua empresa
            </Link>
            <Link href="/cadastro?tipo=project" className={linkClass}>
              Apresente seu projeto
            </Link>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-4">Vamos começar?</p>
          <Link
            href="/entrar"
            className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-energy underline-offset-4 hover:underline"
          >
            Acesse sua conta
            <ArrowUpRight className="size-4" />
          </Link>
          <p className="mt-5 text-xs leading-6 text-ink-foreground/75">
            Perfis e resultados são informados pelas organizações. Conheça os
            detalhes antes de apoiar.
          </p>
          <p className="mt-3 max-w-sm text-xs leading-6 text-ink-foreground/75">
            Doações não garantem abatimento no Imposto de Renda ou outro
            benefício fiscal. Consulte orientações oficiais do governo e um
            profissional de contabilidade para verificar as regras aplicáveis
            ao seu caso.
          </p>
        </div>
      </div>
      <div className="page-container flex flex-wrap justify-between gap-3 border-t border-white/10 py-5 text-xs text-ink-foreground/70">
        <span>© {new Date().getFullYear()} SocialTrade</span>
        <span>Conexões com propósito.</span>
      </div>
    </footer>
  );
}
