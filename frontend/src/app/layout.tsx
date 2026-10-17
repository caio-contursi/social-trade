import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "SocialTrade — conexões que transformam", template: "%s | SocialTrade" },
  description: "Encontre projetos sociais, conheça suas causas e construa conexões para gerar impacto. Uma rede de apoio com informação e transparência.",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR" suppressHydrationWarning><body className="antialiased"><Providers><a href="#conteudo" className="skip-link">Pular para o conteúdo</a>{children}</Providers></body></html>;
}
