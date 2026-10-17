"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="page-container min-h-[65vh] py-24">
      <h1 className="page-title">Algo não saiu como esperado</h1>
      <p className="my-6 text-muted-foreground">
        Tente carregar esta página novamente para continuar.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
