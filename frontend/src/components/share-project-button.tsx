"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareProjectButton() {
  const [sharedUrl, setSharedUrl] = useState("");
  const [status, setStatus] = useState("");

  async function shareProject() {
    const url = `${window.location.origin}${window.location.pathname}`;
    setSharedUrl(url);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API indisponível");
      await navigator.clipboard.writeText(url);
      setStatus("Link direto do projeto copiado.");
    } catch {
      setStatus("Copie o link direto do projeto para compartilhar.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={() => void shareProject()}>
        {status === "Link direto do projeto copiado." ? <Check className="size-4" /> : <Share2 className="size-4" />}
        Compartilhar projeto
      </Button>
      {status && (
        <div role="status" className="w-full space-y-2 text-sm text-muted-foreground">
          <p>{status}</p>
          {sharedUrl && (
            <div className="flex items-center gap-2">
              <Input
                aria-label="Link direto do projeto"
                readOnly
                value={sharedUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Copy aria-hidden="true" className="size-4 shrink-0" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
