import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="conteudo" className="page-container min-h-screen py-10">
      <Brand />
      <div className="mx-auto max-w-lg py-24 text-center">
        <Compass
          className="mx-auto mb-6 size-14 text-primary"
          strokeWidth={1.3}
        />
        <p className="eyebrow">PÁGINA NÃO ENCONTRADA</p>
        <h1 className="mt-5 text-4xl font-semibold">
          Vamos encontrar outro caminho?
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          Este endereço não está disponível. Você pode continuar explorando os
          projetos da nossa rede.
        </p>
        <Button asChild className="mt-8">
          <Link href="/?explorar=projetos#projetos">
            <ArrowLeft />
            Explorar projetos
          </Link>
        </Button>
      </div>
    </main>
  );
}
