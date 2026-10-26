"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  Clipboard,
  HeartHandshake,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDonationAmount, fetchDonationReceipt } from "@/lib/donations";
import { formatDate } from "@/lib/catalog";
import type { Donation, DonationStart, Project } from "@/lib/types";
import {
  EmptyState,
  FormError,
  useSessionRequest,
  useWorkspaceResource,
  WorkspaceError,
  WorkspaceHeading,
  WorkspaceLoading,
} from "./shared";

const statusLabels: Record<Donation["status"], string> = {
  awaiting_payment: "Aguardando Pix",
  awaiting_confirmation: "Aguardando confirmação do projeto",
  confirmed: "Recebimento confirmado",
  rejected: "Não confirmado",
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function DonationsPage() {
  const { user } = useAuth();
  const request = useSessionRequest();
  const donations = useWorkspaceResource<Donation[]>("/api/donations/mine");
  const projects = useWorkspaceResource<Project[]>("/api/public/projects");
  const [selectedProject, setSelectedProject] = useState("");
  const [amount, setAmount] = useState("");
  const [started, setStarted] = useState<DonationStart | null>(null);
  const [e2eValues, setE2eValues] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  if (!user) return null;
  const isDonor = user.account_type === "donor" || user.account_type === "person";
  const donorKind = user.account_type === "person" ? "pessoa física" : "empresa";
  const resourceError = donations.error || (isDonor ? projects.error : null);

  async function startDonation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const amountCents = parseDonationAmount(amount);
    if (!selectedProject || !amountCents) {
      setError("Escolha um projeto habilitado e informe um valor válido a partir de R$ 0,01.");
      return;
    }
    lock.current = true;
    setCreating(true);
    setError(null);
    try {
      const result = await request<DonationStart>("/api/donations", {
        method: "POST",
        body: JSON.stringify({ project_id: Number(selectedProject), amount_cents: amountCents }),
      });
      setStarted(result);
      setE2eValues((values) => ({ ...values, [result.id]: "" }));
      donations.reload();
      toast.success("Intenção criada. Faça o Pix diretamente para o projeto.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível iniciar a doação.");
    } finally {
      lock.current = false;
      setCreating(false);
    }
  }

  async function reportPayment(id: number) {
    if (lock.current) return;
    lock.current = true;
    setBusyId(id);
    setError(null);
    try {
      await request(`/api/donations/${id}/report-payment`, {
        method: "POST",
        body: JSON.stringify({ end_to_end_id: e2eValues[id]?.trim() }),
      });
      setStarted(null);
      donations.reload();
      toast.success("E2E informado. O projeto confirmará o crédito na conta.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível informar o pagamento.");
    } finally {
      lock.current = false;
      setBusyId(null);
    }
  }

  async function confirmReceipt(id: number) {
    if (lock.current) return;
    lock.current = true;
    setBusyId(id);
    setError(null);
    try {
      await request(`/api/donations/${id}/confirm`, { method: "POST" });
      donations.reload();
      toast.success("Recebimento confirmado e comprovante emitido.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o recebimento.");
    } finally {
      lock.current = false;
      setBusyId(null);
    }
  }

  async function downloadReceipt(id: number) {
    if (!user) return;
    try {
      const blob = await fetchDonationReceipt(id, window.sessionStorage.getItem("socialtrade_token") || "");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `socialtrade-recibo-doacao-${id}.html`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível baixar o comprovante.");
    }
  }

  const allProjects = projects.data || [];
  const availableProjects = allProjects.filter((project) => project.pix_donations_available);
  const list = donations.data || [];
  return (
    <>
      <WorkspaceHeading
        eyebrow="Transferência direta"
        title={isDonor ? "Doações por Pix." : "Doações recebidas."}
        description={isDonor
          ? `Escolha um projeto com chave revisada, faça o Pix no seu banco e informe o E2E para o projeto confirmar o recebimento. Você está doando como ${donorKind}.`
          : "Confira os créditos no extrato da própria organização antes de confirmar. O SocialTrade não recebe nem repassa os valores."}
      />
      {resourceError ? (
        <WorkspaceError message={resourceError} retry={() => { donations.reload(); if (isDonor) projects.reload(); }} />
      ) : donations.loading || (isDonor && projects.loading) ? (
        <WorkspaceLoading />
      ) : (
        <>
          <FormError message={error} />
          {isDonor && (
            <section className="surface mb-7">
              <div className="mb-5 flex items-center gap-3">
                <WalletCards className="size-5 text-primary" />
                <h2 className="text-xl font-semibold">Iniciar uma doação Pix</h2>
              </div>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                O site não cobra nem movimenta o dinheiro. Você pagará no aplicativo do banco diretamente à chave do projeto.
              </p>
              {availableProjects.length ? (
                <form onSubmit={startDonation} className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                  <div>
                    <Label htmlFor="donation-project">Projeto social</Label>
                    <select id="donation-project" value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} required className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">Selecione um projeto</option>
                      {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.city}, {project.state}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="donation-amount">Valor em reais</Label>
                    <Input id="donation-amount" inputMode="decimal" placeholder="25,00" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2" required />
                  </div>
                  <Button type="submit" disabled={creating}>{creating ? "Preparando…" : "Continuar para o Pix"}</Button>
                </form>
              ) : (
                <EmptyState title="Nenhum projeto habilitado para Pix" description="Os projetos precisam informar CNPJ e chave Pix e passar pela conferência de uma pessoa moderadora antes de receber doações." icon={<HeartHandshake className="size-6" />} action={<Button asChild variant="outline"><Link href="/projetos">Explorar projetos</Link></Button>} />
              )}
              {started && (
                <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-5" aria-live="polite">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm text-muted-foreground">Doação #{started.id} · {started.project_name}</p><p className="mt-1 text-2xl font-semibold">{money(started.amount_cents)}</p></div>
                    <Badge variant="outline">Pix direto</Badge>
                  </div>
                  <p className="mt-4 text-sm">Chave Pix do projeto</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <code className="min-w-0 flex-1 break-all rounded-lg bg-background p-3 text-sm">{started.pix_key}</code>
                    <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(started.pix_key).then(() => toast.success("Chave Pix copiada."), () => toast.error("Não foi possível copiar a chave."))}><Clipboard className="size-4" />Copiar chave</Button>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{started.payment_instructions} Depois, informe o E2E que aparece no comprovante bancário.</p>
                  <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm leading-relaxed">{started.tax_notice}</p>
                  <PaymentReferenceForm id={started.id} value={e2eValues[started.id] || ""} disabled={busyId === started.id} onChange={(value) => setE2eValues((values) => ({ ...values, [started.id]: value }))} onSubmit={() => void reportPayment(started.id)} />
                </div>
              )}
            </section>
          )}
          <section>
            <h2 className="mb-4 text-xl font-semibold">{isDonor ? "Histórico das minhas doações" : "Movimentações dos projetos"}</h2>
            {list.length ? (
              <div className="space-y-4">{list.map((donation) => (
                <article key={donation.id} className="surface">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm text-muted-foreground">{isDonor ? donation.project_name : donation.donor_name || "Pessoa ou empresa doadora"} · {formatDate(donation.created_at)}</p><h3 className="mt-1 text-xl font-semibold">{money(donation.amount_cents)}</h3></div>
                    <Badge variant={donation.status === "confirmed" ? "secondary" : "outline"}>{statusLabels[donation.status]}</Badge>
                  </div>
                  {isDonor && donation.status === "awaiting_payment" && donation.pix_key && donation.id !== started?.id && (
                    <div className="mt-4 rounded-xl bg-muted/40 p-4"><p className="text-sm font-medium">Chave Pix registrada para esta doação</p><div className="mt-2 flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm">{donation.pix_key}</code><Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(donation.pix_key!).then(() => toast.success("Chave Pix copiada."), () => toast.error("Não foi possível copiar a chave."))}><Clipboard className="size-4" />Copiar</Button></div><PaymentReferenceForm id={donation.id} value={e2eValues[donation.id] || ""} disabled={busyId === donation.id} onChange={(value) => setE2eValues((values) => ({ ...values, [donation.id]: value }))} onSubmit={() => void reportPayment(donation.id)} /></div>
                  )}
                  {donation.end_to_end_id && <p className="mt-4 text-sm text-muted-foreground">E2E informado: <code>{donation.end_to_end_id}</code>{donation.status === "awaiting_confirmation" ? ". O projeto confirmará o crédito na conta." : "."}</p>}
                  {!isDonor && donation.status === "awaiting_confirmation" && (
                    <div className="mt-4 rounded-xl bg-muted/40 p-4"><p className="text-sm leading-relaxed">Quem doou informou o E2E <code>{donation.end_to_end_id}</code>. Confira no extrato da conta do projeto se este valor foi recebido antes de confirmar.</p><Button type="button" className="mt-4" disabled={busyId === donation.id} onClick={() => void confirmReceipt(donation.id)}><CheckCircle2 className="size-4" />{busyId === donation.id ? "Confirmando…" : "Confirmar que recebi"}</Button></div>
                  )}
                  {donation.status === "confirmed" && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Código do recibo: <code>{donation.receipt_code}</code></p><Button type="button" variant="outline" onClick={() => void downloadReceipt(donation.id)}><ArrowDownToLine className="size-4" />Baixar recibo</Button></div>}
                </article>
              ))}</div>
            ) : (
              <EmptyState title={isDonor ? "Ainda não há doações" : "Ainda não há recebimentos"} description={isDonor ? "Quando você iniciar uma doação Pix, ela aparecerá aqui para acompanhamento." : "Quando uma pessoa ou empresa informar um pagamento para um dos seus projetos, você poderá conferir e confirmar o crédito aqui."} icon={isDonor ? <WalletCards className="size-6" /> : <Building2 className="size-6" />} />
            )}
          </section>
          <p className="mt-8 rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
            O E2E é informado por quem doa e não é consultado no banco. A confirmação e o recibo dependem do projeto conferir o crédito na própria conta. Guarde também o comprovante emitido pelo seu banco. A SocialTrade não garante abatimento no Imposto de Renda nem qualquer benefício fiscal: consulte orientações oficiais do governo e um profissional de contabilidade para verificar as regras do seu caso.
          </p>
        </>
      )}
    </>
  );
}

function PaymentReferenceForm({ id, value, disabled, onChange, onSubmit }: {
  id: number; value: string; disabled: boolean; onChange: (value: string) => void; onSubmit: () => void;
}) {
  return (
    <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div><Label htmlFor={`donation-e2e-${id}`}>Identificador E2E do comprovante Pix</Label><Input id={`donation-e2e-${id}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder="E..." minLength={8} maxLength={100} required className="mt-2" /></div>
      <Button type="submit" disabled={disabled}>{disabled ? "Enviando…" : "Informar pagamento"}</Button>
    </form>
  );
}
