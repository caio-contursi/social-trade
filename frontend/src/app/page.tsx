import { DiscoveryLanding } from "@/components/discovery-landing";
import { ArrowRight, Building2, CircleCheck, CircleDashed, HeartHandshake, MessageCircle, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OpenProjectsLink } from "@/components/open-projects-link";
import { Button } from "@/components/ui/button";
import { publicProjects } from "@/lib/server-api";

export const dynamic = "force-dynamic";

const steps = [
  { number: "01", icon: Search, title: "Encontre uma causa", description: "Explore iniciativas por área de atuação e localidade para encontrar projetos que se conectam com seus valores." },
  { number: "02", icon: HeartHandshake, title: "Conheça a história", description: "Leia os objetivos, a atuação e os resultados apresentados pelo projeto antes de decidir como apoiar." },
  { number: "03", icon: MessageCircle, title: "Converse e apoie", description: "Entre em contato com a iniciativa e combine o apoio diretamente com quem realiza o trabalho." },
];

const available = [
  { title: "Pagamentos pela plataforma", description: "A carteira intermediária da SocialTrade recebe SOL na rede Solana. A conciliação e a destinação ainda são manuais." },
  { title: "Informações dos projetos", description: "Histórias, objetivos, ações e resultados são apresentados pelas próprias organizações." },
  { title: "Busca por causa e cidade", description: "Filtros ajudam a localizar iniciativas por tema e região." },
];

const future = [
  "Conversão automatizada de Pix (BRL) para SOL por provedor",
  "Registro das doações na rede Solana",
  "Prestação de contas ampliada dos projetos",
];

export default async function HomePage() {
  const { projects, error } = await publicProjects();
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <DiscoveryLanding projects={projects} error={error} />
        <div className="landing-details">
          <section id="quem-somos" className="page-container py-4 sm:py-4" aria-labelledby="about-title">
            <div className="ink-panel relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-12 sm:py-8">
              <div aria-hidden="true" className="dot-pattern absolute inset-0 opacity-[.06]" />
              <div className="relative grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end">
                <div>
                  <p className="eyebrow mb-4">Quem somos</p>
                  <h2 id="about-title" className="display-2">Conectamos quem quer apoiar a quem <span className="title-mark">faz acontecer</span>.</h2>
                </div>
                <div className="space-y-4 text-justify text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
                  <p>A SocialTrade é uma plataforma que aproxima empresas, pessoas e projetos sociais em um espaço de descoberta, informação e contato.</p>
                  <p>Fazemos esse trabalho para tornar mais simples encontrar iniciativas alinhadas a cada causa e abrir caminhos para que o apoio chegue diretamente a elas.</p>
                </div>
              </div>
              <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/10"><Building2 className="size-5 text-energy" aria-hidden="true" /><h3 className="mt-4 font-display text-xl font-medium">Para quem apoia</h3><p className="mt-2 text-sm leading-relaxed text-ink-foreground/75">Mais clareza para conhecer causas, projetos e formas de contribuir.</p></div>
                <div className="rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/10"><HeartHandshake className="size-5 text-energy" aria-hidden="true" /><h3 className="mt-4 font-display text-xl font-medium">Para quem realiza</h3><p className="mt-2 text-sm leading-relaxed text-ink-foreground/75">Um espaço para apresentar sua atuação e se aproximar de novos apoiadores.</p></div>
              </div>
            </div>
          </section>

          <section className="border-y" id="como-funciona" aria-labelledby="how-title">
            <div className="page-container py-16 sm:py-24">
              <div className="max-w-2xl"><p className="eyebrow mb-3">Como funciona</p><h2 id="how-title" className="display-2">Apoiar uma causa começa com <span className="title-mark">uma conexão</span>.</h2></div>
              <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
                {steps.map(({ number, icon: Icon, title, description }) => <li key={number}><div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary"><Icon className="size-6" strokeWidth={1.6} aria-hidden="true" /></span><span className="font-display text-5xl font-semibold italic leading-none text-[var(--forest-number)]">{number}</span></div><h3 className="mt-6 text-2xl font-medium">{title}</h3><p className="mt-3 text-justify leading-relaxed text-muted-foreground">{description}</p></li>)}
              </ol>
              <div className="mt-14 border-t pt-10" aria-labelledby="choose-project-title">
                <h3 id="choose-project-title" className="font-display text-2xl font-medium">Como escolher e apoiar um projeto?</h3>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <article className="rounded-2xl border bg-background p-6">
                    <h4 className="font-semibold">Conheça antes de decidir</h4>
                    <p className="mt-2 text-justify text-sm leading-relaxed text-muted-foreground">Leia os objetivos, a atuação, a cidade e os resultados informados pelo projeto. Confira se a causa, a necessidade e o uso previsto do apoio fazem sentido para você; em caso de dúvida, converse com a organização e peça informações adicionais.</p>
                  </article>
                  <article className="rounded-2xl border bg-background p-6">
                    <h4 className="font-semibold">Escolha como contribuir</h4>
                    <p className="mt-2 text-justify text-sm leading-relaxed text-muted-foreground">O Pix está temporariamente suspenso enquanto a conversão BRL→SOL é integrada. O endereço SOL no painel recebe na carteira intermediária da SocialTrade e ainda não vincula automaticamente o pagamento a uma iniciativa. Você também pode conversar com a organização sobre voluntariado ou doações de itens, se ela aceitar.</p>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <section className="page-container py-16 sm:py-24" id="transparencia" aria-labelledby="trust-title">
            <div className="ink-panel relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 dark:ring-1 dark:ring-white/10">
              <div aria-hidden="true" className="dot-pattern absolute inset-0 opacity-[.06]" />
              <div className="relative grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
                <div><p className="eyebrow mb-4">Transparência</p><h2 id="trust-title" className="display-2">Confiança se constrói com <span className="title-mark">informação</span>.</h2><p className="mt-6 max-w-md text-justify leading-relaxed text-ink-foreground/80">Deixamos claro de onde vêm as informações e o que está disponível. Os perfis e resultados são informados pelas próprias organizações, para que cada pessoa ou empresa possa conhecer a iniciativa antes de apoiar.</p><Button asChild variant="energy" size="lg" className="mt-8"><OpenProjectsLink>Conhecer os projetos <ArrowRight className="size-4" /></OpenProjectsLink></Button></div>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white/[.06] p-6 ring-1 ring-white/10"><p className="flex items-center gap-2 text-sm font-semibold"><CircleCheck className="size-4 text-energy" aria-hidden="true" />Disponível agora</p><ul className="mt-4 space-y-4">{available.map((item) => <li key={item.title}><p className="font-display text-lg font-medium">{item.title}</p><p className="mt-1 text-sm leading-relaxed text-ink-foreground/75">{item.description}</p></li>)}</ul></div>
                  <div className="rounded-2xl border border-dashed border-white/25 p-6"><p className="flex items-center gap-2 text-sm font-semibold"><CircleDashed className="size-4 text-energy" aria-hidden="true" />Planejado, ainda não disponível</p><ul className="mt-4 space-y-2.5">{future.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-ink-foreground/85"><span aria-hidden="true" className="size-1.5 rounded-full bg-energy" />{item}</li>)}</ul></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
