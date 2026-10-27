import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RouteScrollManager } from "@/components/route-scroll-manager";
import { RouteTransitionManager } from "@/components/route-transition-manager";

export const metadata: Metadata = {
  title: {
    default: "SocialTrade",
    template: "%s | SocialTrade",
  },
  description:
    "Encontre projetos sociais, conheça suas causas e construa conexões para gerar impacto. Uma rede de apoio com informação e transparência.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <RouteScrollManager />
          <RouteTransitionManager />
          <a href="#conteudo" className="skip-link">
            Pular para o conteúdo
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
