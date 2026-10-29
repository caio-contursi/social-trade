import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  HeartHandshake,
  Leaf,
  Sprout,
} from "lucide-react";
import { Brand } from "@/components/brand";

export function AuthShell({
  children,
  registration = false,
}: {
  children: React.ReactNode;
  registration?: boolean;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(320px,.8fr)_1.2fr]">
      <aside className="ink-panel relative hidden flex-col overflow-hidden p-10 lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="dot-pattern absolute inset-0 opacity-[.06]"
        />
        <Link
          data-route-transition
          href="/"
          aria-label="SocialTrade, página inicial"
          className="relative w-fit rounded-sm"
        >
          <Brand />
        </Link>
        <div className="relative my-auto max-w-md py-16">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-white/[.07] text-energy ring-1 ring-white/10">
            <HeartHandshake className="size-7" strokeWidth={1.5} />
          </div>
          <p className="eyebrow mb-5">Conexões que transformam</p>
          <h2 className="text-4xl leading-[1.1] font-medium xl:text-5xl">
            O próximo passo de uma boa causa pode{" "}
            <span className="title-mark">começar aqui</span>.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-foreground/80">
            Aproxime a vontade de apoiar de quem faz a diferença. Conheça
            projetos, compartilhe sua história e construa novas conexões.
          </p>
          <div className="mt-10 space-y-5 border-t border-white/10 pt-7">
            <div className="flex gap-3">
              <Sprout className="mt-0.5 size-5 shrink-0 text-energy" />
              <div>
                <p className="text-sm font-semibold">
                  Cada causa tem uma história
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-foreground/75">
                  Objetivos e resultados apresentados pelos próprios projetos.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Leaf className="mt-0.5 size-5 shrink-0 text-energy" />
              <div>
                <p className="text-sm font-semibold">
                  Encontre seu jeito de participar
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-foreground/75">
                  Um espaço para empresas, projetos e pessoas.
                </p>
              </div>
            </div>
          </div>
        </div>
        <Link
          data-route-transition
          href="/?explorar=projetos#projetos"
          className="relative inline-flex w-fit items-center gap-2 rounded-sm text-sm font-semibold text-energy underline-offset-4 hover:underline"
        >
          Conhecer os projetos <ArrowUpRight className="size-4" />
        </Link>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-6 sm:px-10">
          <Link
            data-route-transition
            href="/"
            className="lg:hidden"
            aria-label="SocialTrade, página inicial"
          >
            <Brand compact />
          </Link>
          <Link
            data-route-transition
            href="/"
            className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:inline-flex"
          >
            <ArrowLeft className="size-4" /> Voltar ao início
          </Link>
          <p className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">
              {registration ? "Já participa? " : "Primeira vez? "}
            </span>
            <Link
              href={registration ? "/entrar" : "/cadastro"}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {registration ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </header>
        <main
          id="conteudo"
          className={`mx-auto flex w-full flex-1 flex-col justify-center px-5 py-8 sm:px-10 ${registration ? "max-w-2xl" : "max-w-lg"}`}
        >
          {children}
        </main>
        <footer className="px-5 py-6 text-center text-xs leading-relaxed text-muted-foreground sm:px-10">
          SocialTrade · Boas causas, novas conexões.
        </footer>
      </div>
    </div>
  );
}
