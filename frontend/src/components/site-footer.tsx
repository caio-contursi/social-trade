"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { OpenProjectsLink } from "@/components/open-projects-link";
import { useAuth } from "@/components/auth-provider";

const linkClass =
  "footer-link rounded-sm underline-offset-4 decoration-primary hover:underline";

export function SiteFooter() {
  const { user } = useAuth();
  const suggestionPath = "/painel/suporte?tipo=sugestao";
  const suggestionHref = user
    ? suggestionPath
    : `/entrar?proximo=${encodeURIComponent(suggestionPath)}`;

  return (
    <footer className="site-footer-cream">
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
          <p className="footer-copy mt-2 max-w-xs text-sm leading-6">
            Uma rede para aproximar quem quer apoiar de quem faz acontecer.
          </p>
          <p className="footer-copy mt-3 max-w-xs text-sm font-medium leading-6">
            Uma ação conjunta de Caio, Bruno e Pedro. Para reafirmar o conceito de cidadania. Para promover a inclusão social. Para todos.
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
            <Link href={suggestionHref} className={linkClass}>
              Deixe uma sugestão!
            </Link>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-4">Vamos começar?</p>
          <Link
            href="/entrar"
            className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[#145b4b] underline-offset-4 hover:underline"
          >
            Acesse sua conta
            <ArrowUpRight className="size-4" />
          </Link>
          <p className="footer-copy mt-5 max-w-sm text-justify text-xs leading-6">
            Perfis e resultados são informados pelas organizações. Conheça os detalhes antes de apoiar.
          </p>
          <p className="footer-copy mt-3 max-w-sm text-justify text-xs leading-6">
            Quando disponível, o Pix é transferido diretamente ao projeto; a SocialTrade não recebe nem retém valores. A doação não garante abatimento no Imposto de Renda ou outro benefício fiscal.
          </p>
          <p className="footer-copy mt-3 max-w-sm text-justify text-xs leading-6">
            Consulte orientações oficiais do governo e um profissional de contabilidade para verificar se alguma regra se aplica ao seu caso.
          </p>
        </div>
      </div>
      <div className="footer-rule page-container flex flex-wrap justify-between gap-3 border-t py-5 text-xs text-[#596a5e]">
        <span>© {new Date().getFullYear()} SocialTrade</span>
        <span>Conexões com propósito.</span>
      </div>
    </footer>
  );
}
