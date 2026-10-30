"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  Clipboard,
  Clock3,
  HandCoins,
  HeartHandshake,
  Landmark,
  LoaderCircle,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/validated-form";
import { convertDonationCurrency, fetchDonationReceipt, parseDonationAmount, parseSolAmount } from "@/lib/donations";
import { areaLabels, formatDate } from "@/lib/catalog";
import type { Donation, Project } from "@/lib/types";
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
  awaiting_payment: "Pagamento pendente",
  awaiting_confirmation: "Aguardando confirmação do projeto",
  confirmed: "Recebimento confirmado",
  rejected: "Não confirmado",
};

interface SolanaPaymentIntent {
  id: number;
  target: "project" | "socialtrade";
  project_id: number | null;
  cause_code: string | null;
  amount_lamports: number;
  reference: string;
  recipient_address: string;
  payment_uri: string;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  transaction_signature: string | null;
  expires_at: string | null;
}

interface SolQuote {
  brl_per_sol: string;
  updated_at: number;
  expires_at: number;
  source: string;
}

type SessionRequest = <T,>(path: string, options?: RequestInit) => Promise<T>;

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function DonationsPage() {
  const { user } = useAuth();
  const request = useSessionRequest();
  const donations = useWorkspaceResource<Donation[]>("/api/donations/mine");
  const projects = useWorkspaceResource<Project[]>("/api/public/projects");
  const [donationTarget, setDonationTarget] = useState<"project" | "socialtrade">("project");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "sol" | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectArea, setProjectArea] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  if (!user) return null;
  const isDonor = user.account_type === "donor" || user.account_type === "person";
  const resourceError = donations.error || (isDonor ? projects.error : null);

  function flagMissingProject() {
    setProjectError("Selecione o campo “Projeto social” para continuar.");
    focusField("donation-project");
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
  const availableProjects = allProjects;
  const projectAreas = [...new Set(availableProjects.flatMap((project) => project.areas))]
    .sort((a, b) => (areaLabels[a] || a).localeCompare(areaLabels[b] || b, "pt-BR"));
  const normalizedQuery = projectQuery.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filteredProjects = availableProjects.filter((project) => {
    const matchesArea = !projectArea || project.areas.includes(projectArea);
    const searchable = `${project.name} ${project.city} ${project.state}`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    return matchesArea && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const list = (donations.data || []).filter((donation) => !isDonor || donation.status !== "awaiting_payment");
  return (
    <>
      <WorkspaceHeading
        title={isDonor ? "Contribua com uma causa." : "Doações recebidas."}
        description={isDonor ? undefined : "Confira as movimentações registradas para sua organização."}
      />
      {resourceError ? (
        <WorkspaceError message={resourceError} retry={() => { donations.reload(); if (isDonor) projects.reload(); }} />
      ) : donations.loading || (isDonor && projects.loading) ? (
        <WorkspaceLoading />
      ) : (
        <>
          <FormError message={error} />
          {isDonor && (
            <>
              <section className="surface mb-6">
                <p className="eyebrow mb-3">Etapa 1 · Destino</p>
                <h2 className="text-xl font-semibold">Como você quer direcionar sua doação?</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <button type="button" aria-pressed={donationTarget === "project"} onClick={() => setDonationTarget("project")} className={`rounded-2xl border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${donationTarget === "project" ? "border-primary bg-primary/5 ring-1 ring-primary/25" : "bg-card hover:bg-muted/40"}`}>
                    <span className="flex items-center gap-3"><HeartHandshake className="size-5 text-primary" /><span className="font-semibold">Ajude seu projeto favorito!</span></span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">Escolha uma iniciativa pelo nome ou encontre projetos por categoria.</span>
                    <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Seleção de projeto</span>
                  </button>
                  <button type="button" aria-pressed={donationTarget === "socialtrade"} onClick={() => setDonationTarget("socialtrade")} className={`rounded-2xl border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${donationTarget === "socialtrade" ? "border-primary bg-primary/5 ring-1 ring-primary/25" : "bg-card hover:bg-muted/40"}`}>
                    <span className="flex items-center gap-3"><Landmark className="size-5 text-primary" /><span className="font-semibold">Doe indiretamente</span></span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">Indique uma causa para registrar a destinação pretendida.</span>
                    <span className="mt-3 inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">Conferência manual</span>
                  </button>
                </div>
              </section>

              {donationTarget === "socialtrade" ? (
                <section className="surface mb-7" aria-live="polite">
                  <div className="mb-4 flex items-center gap-3">
                    <HandCoins className="size-5 text-primary" />
                    <h2 className="text-xl font-semibold">Doação por categoria</h2>
                  </div>
                  <p className="leading-relaxed text-muted-foreground">A carteira recebe SOL pela rede Solana. A escolha de causa registra sua intenção, mas não vincula automaticamente uma transferência nem cria uma alocação ou comprovante. A distribuição ainda precisa ser tratada manualmente pela SocialTrade.</p>
                  <div className="mt-5 max-w-sm"><Label htmlFor="donation-indirect-cause">Causa de interesse</Label><select id="donation-indirect-cause" value={projectArea} onChange={(event) => setProjectArea(event.target.value)} className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">Todas as causas</option>{projectAreas.map((area) => <option key={area} value={area}>{areaLabels[area] || area}</option>)}</select></div>
                  <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} className="mt-6">
                    {paymentMethod === "sol" && <SolWalletCard request={request} target="socialtrade" projectId={null} causeCode={projectArea || null} />}
                    {paymentMethod === "pix" && <PixDonationCard />}
                  </PaymentMethodSelector>
                </section>
              ) : (
                <>
                  <section className="surface mb-7">
                    <div className="mb-5 flex items-center gap-3">
                      <WalletCards className="size-5 text-primary" />
                      <h2 className="text-xl font-semibold">Doar diretamente para um projeto</h2>
                    </div>
                    {availableProjects.length ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr] sm:items-end">
                  <div>
                    <Label htmlFor="donation-project-search">Pesquisar projetos</Label>
                    <Input id="donation-project-search" type="search" value={projectQuery} onChange={(event) => { setProjectQuery(event.target.value.replace(/[^\p{L}\s'-]/gu, "")); setSelectedProject(""); }} placeholder="Nome, cidade ou estado" className="mt-2 h-11 border-border bg-background shadow-none dark:bg-background" />
                  </div>
                  <div>
                    <Label htmlFor="donation-project-area">Categoria</Label>
                    <select id="donation-project-area" value={projectArea} onChange={(event) => { setProjectArea(event.target.value); setSelectedProject(""); }} className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">Todas as categorias</option>
                      {projectAreas.map((area) => <option key={area} value={area}>{areaLabels[area] || area}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="donation-project">Projeto social</Label>
                    <select id="donation-project" value={selectedProject} onChange={(event) => { setSelectedProject(event.target.value); if (event.target.value) setProjectError(null); }} aria-invalid={projectError ? true : undefined} aria-describedby={projectError ? "donation-project-error" : undefined} className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20">
                      <option value="">Selecione um projeto</option>
                      {filteredProjects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.city}, {project.state}</option>)}
                    </select>
                  </div>
                  {projectError && <div className="sm:col-span-3 sm:-mt-2"><FieldError id="donation-project-error">{projectError}</FieldError></div>}
                </div>
                    ) : (
                <EmptyState title="Nenhum projeto encontrado" description="Não há projetos disponíveis para selecionar agora." icon={<HeartHandshake className="size-6" />} action={<Button asChild variant="outline"><Link href="/?explorar=projetos#projetos">Explorar projetos</Link></Button>} />
                    )}
                    <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} className="mt-6">
                      {paymentMethod === "sol" && <SolWalletCard request={request} target="project" projectId={selectedProject ? Number(selectedProject) : null} causeCode={projectArea || null} onMissingProject={flagMissingProject} />}
                      {paymentMethod === "pix" && <PixDonationCard requiresProject={!selectedProject} onMissingProject={flagMissingProject} />}
                    </PaymentMethodSelector>
                  </section>
                </>
              )}
            </>
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
                  {donation.end_to_end_id && <p className="mt-4 text-sm text-muted-foreground">E2E informado: <code>{donation.end_to_end_id}</code>{donation.status === "awaiting_confirmation" ? ". O projeto confirmará o crédito na conta." : "."}</p>}
                  {!isDonor && donation.status === "awaiting_confirmation" && (
                    <div className="mt-4 rounded-xl bg-muted/40 p-4"><p className="text-sm leading-relaxed">Quem doou informou o E2E <code>{donation.end_to_end_id}</code>. Confira no extrato da conta do projeto se este valor foi recebido antes de confirmar.</p><Button type="button" className="mt-4" disabled={busyId === donation.id} onClick={() => void confirmReceipt(donation.id)}><CheckCircle2 className="size-4" />{busyId === donation.id ? "Confirmando…" : "Confirmar que recebi"}</Button></div>
                  )}
                  {donation.status === "confirmed" && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Código do recibo: <code>{donation.receipt_code}</code></p><Button type="button" variant="outline" onClick={() => void downloadReceipt(donation.id)}><ArrowDownToLine className="size-4" />Baixar recibo</Button></div>}
                </article>
              ))}</div>
            ) : (
              <EmptyState title={isDonor ? "Ainda não há doações" : "Ainda não há recebimentos"} description={isDonor ? "Quando uma doação for registrada e conferida pela SocialTrade, ela aparecerá aqui." : "Os pagamentos recebidos para os projetos aparecerão aqui."} icon={isDonor ? <WalletCards className="size-6" /> : <Building2 className="size-6" />} />
            )}
          </section>
          <p className="mt-8 rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
            A SocialTrade não garante abatimento no Imposto de Renda nem qualquer benefício fiscal. Consulte orientações oficiais do governo e um profissional de contabilidade para verificar as regras do seu caso.
          </p>
        </>
      )}
    </>
  );
}

function SolWalletCard({ request, target, projectId, causeCode, onMissingProject }: {
  request: SessionRequest;
  target: "project" | "socialtrade";
  projectId: number | null;
  causeCode: string | null;
  onMissingProject?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [entry, setEntry] = useState<{ currency: "BRL" | "SOL"; value: string }>({ currency: "BRL", value: "" });
  const [quote, setQuote] = useState<SolQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [intent, setIntent] = useState<SolanaPaymentIntent | null>(null);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const cancelLock = useRef(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const rate = quote ? Number(quote.brl_per_sol) : 0;
  const amount = intent && intent.status !== "expired" ? String(intent.amount_lamports / 1_000_000_000)
    : entry.currency === "SOL" ? entry.value : convertDonationCurrency(entry.value, "BRL", rate);
  const brlAmount = entry.currency === "BRL" && (!intent || intent.status === "expired") ? entry.value : convertDonationCurrency(amount, "SOL", rate);
  const amountLamports = parseSolAmount(amount);
  const quoteFresh = Boolean(quote && quote.expires_at * 1000 > Date.now());

  useEffect(() => {
    if (intent && intent.status !== "expired" && quote) return;
    let active = true;
    const loadQuote = async () => {
      try {
        const next = await request<SolQuote>("/api/solana-payments/quote");
        if (!Number.isFinite(Number(next.brl_per_sol)) || Number(next.brl_per_sol) <= 0 || next.expires_at * 1000 <= Date.now()) throw new Error("Cotação desatualizada. Tente atualizar.");
        if (active) { setQuote(next); setQuoteError(null); }
      } catch (reason) {
        if (active) { setQuote(null); setQuoteError(reason instanceof Error ? reason.message : "Cotação indisponível."); }
      }
    };
    void loadQuote();
    const timer = intent && intent.status !== "expired" ? undefined : window.setInterval(() => void loadQuote(), 60_000);
    return () => { active = false; if (timer !== undefined) window.clearInterval(timer); };
  }, [request, quoteVersion, intent?.id, intent?.status]);

  async function createIntent() {
    if (amountLamports === null || (target === "project" && projectId === null) || creating) return;
    if (!quoteFresh) { setQuoteError("Atualize a cotação antes de gerar o QR."); setQuoteVersion((value) => value + 1); return; }
    setCreating(true);
    cancelLock.current = false;
    setCreateError(null);
    try {
      const created = await request<SolanaPaymentIntent>("/api/solana-payments/intents", {
        method: "POST",
        body: JSON.stringify({ amount_lamports: amountLamports, target, project_id: projectId, cause_code: causeCode }),
      });
      window.sessionStorage.setItem("socialtrade_solana_payment_intent_id", String(created.id));
      setQuote(quote);
      setIntent(created);
      setCheckError(null);
      setOpen(true);
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : "Não foi possível preparar o pagamento.");
    } finally {
      setCreating(false);
    }
  }

  async function cancelIntent() {
    if (!intent || cancelLock.current) return;
    cancelLock.current = true;
    setCancelling(true);
    setOpen(false);
    try {
      await request(`/api/solana-payments/intents/${intent.id}/cancel`, { method: "POST" });
      window.sessionStorage.removeItem("socialtrade_solana_payment_intent_id");
      setIntent(null);
      setCheckError(null);
    } catch (reason) {
      cancelLock.current = false;
      setCheckError(reason instanceof Error ? reason.message : "Não foi possível cancelar o pedido. Tente novamente.");
      setCreateError(reason instanceof Error ? reason.message : "Não foi possível cancelar o pedido. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  }

  async function copyAddress() {
    if (!intent) return;
    try {
      await navigator.clipboard.writeText(intent.recipient_address);
      toast.success("Endereço Solana copiado.");
    } catch {
      toast.error("Não foi possível copiar o endereço.");
    }
  }

  useEffect(() => {
    const savedIntentId = window.sessionStorage.getItem("socialtrade_solana_payment_intent_id");
    if (!savedIntentId || !/^\d+$/.test(savedIntentId)) return;
    let active = true;
    request<SolanaPaymentIntent>(`/api/solana-payments/intents/${savedIntentId}/verify`, { method: "POST" })
      .then((saved) => {
        if (!active) return;
        if (saved.status === "expired" || saved.status === "cancelled") {
          window.sessionStorage.removeItem("socialtrade_solana_payment_intent_id");
          return;
        }
        setIntent(saved);
      })
      .catch((reason) => {
        if (active) setCreateError(reason instanceof Error ? reason.message : "Não foi possível retomar a consulta do pagamento.");
      });
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    if (!open || !intent || intent.status !== "pending") return;
    let active = true;
    let timer: number | undefined;
    const checkStatus = async () => {
      try {
        const updated = await request<SolanaPaymentIntent>(`/api/solana-payments/intents/${intent.id}/verify`, { method: "POST" });
        if (!active || cancelLock.current) return;
        if (updated.status === "cancelled") {
          setOpen(false);
          setIntent(null);
          window.sessionStorage.removeItem("socialtrade_solana_payment_intent_id");
          return;
        }
        setIntent(updated);
        setCheckError(null);
        if (updated.status === "pending") timer = window.setTimeout(checkStatus, 2_000);
      } catch (reason) {
        if (!active || cancelLock.current) return;
        setCheckError(reason instanceof Error ? reason.message : "A consulta à rede falhou temporariamente.");
        timer = window.setTimeout(checkStatus, 5_000);
      }
    };
    timer = window.setTimeout(checkStatus, 1_500);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [open, intent?.id, intent?.status, request]);

  const activeIntent = intent && intent.status !== "expired";
  const requiresProject = target === "project" && projectId === null;


  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-primary/25 bg-primary/5 p-5" aria-label="Pagamento em SOL">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`brl-amount-${target}`}>Valor da doação em reais</Label>
          <Input id={`brl-amount-${target}`} inputMode="decimal" placeholder="Ex.: 25,00" value={brlAmount} onChange={(event) => { setEntry({ currency: "BRL", value: event.target.value }); setAmountError(null); }} disabled={Boolean(activeIntent) || !quoteFresh} aria-invalid={amountError ? true : undefined} aria-describedby={amountError ? `amount-error-${target}` : undefined} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`sol-amount-${target}`}>Valor da doação em SOL</Label>
          <Input id={`sol-amount-${target}`} inputMode="decimal" placeholder="Ex.: 0,05" value={amount} onChange={(event) => { setEntry({ currency: "SOL", value: event.target.value }); setAmountError(null); }} disabled={Boolean(activeIntent) || !quoteFresh} aria-invalid={amountError ? true : undefined} aria-describedby={amountError ? `amount-error-${target}` : undefined} />
        </div>
        {amountError && <div className="-mt-2 sm:col-span-2"><FieldError id={`amount-error-${target}`}>{amountError}</FieldError></div>}
        {!quote && quoteError && <p role="status" className="text-xs text-muted-foreground sm:col-span-2">{quoteError}</p>}
        {quoteError && <Button type="button" variant="outline" onClick={() => setQuoteVersion((value) => value + 1)}>Atualizar cotação</Button>}
        <PaymentQrTrigger requiresProject={requiresProject} requiresAmount={amountLamports === null} disabled={creating || cancelling || (!activeIntent && !quoteFresh)} onMissingProject={onMissingProject} onMissingAmount={() => {
          setAmountError(brlAmount.trim() || amount.trim() ? "Informe um valor válido para o campo “Valor da doação em reais” ou “Valor da doação em SOL”." : "Preencha o campo “Valor da doação em reais” ou “Valor da doação em SOL” para continuar.");
          focusField(`brl-amount-${target}`);
        }} onClick={() => activeIntent ? setOpen(true) : void createIntent()}>
          {creating ? <><LoaderCircle className="size-4 animate-spin" />Preparando QR…</> : "Visualizar QR Code"}
        </PaymentQrTrigger>
      </div>
      {createError && <p role="alert" className="mt-3 text-sm text-destructive">{createError}</p>}
      <Dialog open={open && Boolean(intent)} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && intent?.status === "confirmed") window.sessionStorage.removeItem("socialtrade_solana_payment_intent_id");
      }}>
        {intent && (
        <DialogContent className={`max-h-[90dvh] overflow-y-auto sm:max-w-md ${intent.status === "pending" ? "pt-10" : ""}`} aria-label="Pagamento em SOL" {...(intent.status === "pending" ? { "aria-describedby": undefined } : {})}>
          <DialogHeader className={intent.status === "pending" ? "sr-only" : undefined}>
            <DialogTitle>{intent?.status === "confirmed" ? "Pagamento confirmado" : intent?.status === "expired" ? "QR expirado" : "Pagamento em SOL"}</DialogTitle>
            {intent.status !== "pending" && <DialogDescription>
              {intent?.status === "confirmed"
                ? "A rede Solana confirmou a transferência para a carteira intermediária da SocialTrade."
                : intent?.status === "expired"
                  ? "O prazo deste QR terminou sem que uma transferência válida fosse localizada. Gere outro QR para tentar novamente."
                  : ""}
            </DialogDescription>}
          </DialogHeader>
          {intent?.status === "confirmed" ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4" role="status" data-testid="sol-payment-confirmed">
              <div className="flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="size-5" />Pagamento confirmado na rede Solana</div>
              <p className="text-sm">Valor: <strong>{(intent.amount_lamports / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 9 })} SOL</strong></p>
              {intent.transaction_signature && <p className="break-all text-xs text-muted-foreground">Assinatura: <code>{intent.transaction_signature}</code></p>}
              {intent.transaction_signature && <a className="text-sm font-medium text-primary underline underline-offset-4" href={`https://explorer.solana.com/tx/${intent.transaction_signature}`} target="_blank" rel="noreferrer">Ver transação no Solana Explorer</a>}
              <p className="text-xs leading-relaxed text-muted-foreground">O pagamento foi recebido pela carteira SocialTrade. A categoria ou projeto escolhido registra sua intenção de destinação; não representa repasse automático.</p>
            </div>
          ) : intent?.status === "expired" ? (
            <Button type="button" onClick={() => { setIntent(null); setOpen(false); window.sessionStorage.removeItem("socialtrade_solana_payment_intent_id"); }}>Fechar e gerar outro QR</Button>
          ) : (
            <>
              <SolNetworkWarning />
              <div className="mx-auto rounded-xl bg-white p-3 shadow-sm" data-testid="solana-pay-qr" data-payment-uri={intent!.payment_uri}>
                <QRCodeSVG value={intent!.payment_uri} size={220} level="M" title="QR code de pagamento SocialTrade em SOL via Solana Pay" />
              </div>
              <div className="space-y-3">
                <p className="text-center text-sm font-medium">Endereço da carteira SocialTrade</p>
                <button type="button" aria-label="Copiar endereço da carteira Solana SocialTrade" aria-description={intent.recipient_address} onClick={() => void copyAddress()} className="group relative block min-h-11 w-full cursor-pointer overflow-hidden rounded-md border bg-input/30 px-3 py-2 text-center outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" data-testid="socialtrade-solana-address">
                  <span className="break-all font-mono text-xs">{intent.recipient_address}</span>
                  <span aria-hidden="true" data-testid="wallet-copy-hint" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-background/95 text-sm font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100"><Clipboard className="size-4" />copiar</span>
                </button>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-sm" role="status" aria-live="polite">
                <div className="flex items-center gap-2 font-medium"><LoaderCircle className="size-4 animate-spin" />Aguardando confirmação da transação…</div>
                <p className="mt-1 text-xs text-muted-foreground">O QR Code não expira. O processo só finaliza ao confirmar a transação ou cancelar o pagamento.</p>
                {checkError && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">A consulta falhou temporariamente; vamos tentar novamente. {checkError}</p>}
              </div>
              <Button type="button" variant="outline" onClick={() => void cancelIntent()} disabled={cancelling}>Cancelar pagamento</Button>
            </>
          )}
        </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function SolNetworkWarning() {
  return <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-relaxed text-foreground"><strong>ATENÇÃO! Transação somente na rede Solana.</strong> Utilização de outra rede pode causar perda permanente do valor.</p>;
}

const paymentMethods = [
  { code: "pix", title: "Pix · BRL", description: "Pagamento temporariamente indisponível até a integração do provedor de conversão.", icon: <WalletCards className="size-5 shrink-0 text-muted-foreground" /> },
  { code: "sol", title: "SOL · Solana Pay", description: "Gere um QR compatível com a Phantom e envie SOL à carteira intermediária.", icon: <HandCoins className="size-5 shrink-0 text-primary" /> },
] as const;

function PaymentMethodSelector({ selected, onSelect, className = "", children }: {
  selected: "pix" | "sol" | null;
  onSelect: (method: "pix" | "sol") => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={className} aria-label="Forma de pagamento">
      <p className="mb-3 text-sm font-semibold">Escolha como pagar</p>
      <div className="grid gap-4 md:min-h-56 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        {paymentMethods.map(({ code, title, description, icon }) => {
          const isSelected = selected === code;
          const isDimmed = selected !== null && !isSelected;
          return (
            <button key={code} type="button" aria-pressed={isSelected} onClick={() => onSelect(code)} data-state={isSelected ? "selected" : isDimmed ? "dimmed" : "idle"} className={`flex flex-col justify-start overflow-hidden rounded-xl border p-4 text-left transition-[flex-grow,background-color,border-color,box-shadow,opacity] duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none md:min-h-0 md:basis-0 ${isSelected ? "grow-[3] border-primary bg-primary/5 shadow-md ring-1 ring-primary/25" : isDimmed ? "grow bg-muted/10 opacity-70 hover:bg-muted/40 hover:opacity-100" : "grow bg-muted/20 hover:bg-muted/40"}`}>
              <span className="flex items-center gap-3">{icon}<span className="font-semibold">{title}</span></span>
              <span aria-hidden={isDimmed || undefined} className={`mt-2 block text-sm leading-relaxed text-muted-foreground transition-opacity duration-200 motion-reduce:transition-none ${isDimmed ? "opacity-0" : "opacity-100"}`}>{description}</span>
            </button>
          );
        })}
      </div>
      <div className="h-full" data-testid="payment-details">
        {selected ? children : <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-5 text-center text-sm text-muted-foreground">Escolha uma forma de pagamento para informar o valor da doação.</div>}
      </div>
      </div>
    </section>
  );
}

function focusField(id: string) {
  requestAnimationFrame(() => {
    const field = document.getElementById(id);
    if (!field) return;
    field.focus();
    field.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  });
}

function PaymentQrTrigger({ requiresProject, requiresAmount, amountHint = "Digite um valor válido em reais ou SOL!", disabled, onClick, onMissingProject, onMissingAmount, children }: {
  requiresProject: boolean; requiresAmount: boolean; amountHint?: string; disabled: boolean; onClick: () => void; onMissingProject?: () => void; onMissingAmount?: () => void; children: React.ReactNode;
}) {
  const tooltipId = useId();
  const hint = requiresProject ? "Escolha um projeto para ajudar!" : requiresAmount ? amountHint : null;
  function flagMissing() {
    if (disabled) return;
    if (requiresProject) onMissingProject?.();
    else if (requiresAmount) onMissingAmount?.();
  }
  return (
    <span className={`group relative inline-flex justify-self-center sm:col-span-2 ${hint ? "cursor-not-allowed" : ""}`} role={hint ? "group" : undefined} tabIndex={hint ? 0 : undefined} aria-describedby={hint ? tooltipId : undefined} data-testid="payment-qr-trigger"
      onClick={hint ? flagMissing : undefined} onKeyDown={hint ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flagMissing(); } } : undefined}>
      <Button type="button" disabled={disabled || Boolean(hint)} aria-describedby={hint ? tooltipId : undefined} onClick={() => { if (!hint) onClick(); }}>{children}</Button>
      {hint && <span id={tooltipId} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-center text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{hint}</span>}
    </span>
  );
}

function PixDonationCard({ requiresProject = false, onMissingProject }: { requiresProject?: boolean; onMissingProject?: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const numericAmount = Number(amount.replace(",", "."));
  const formattedAmount = Number.isFinite(numericAmount) && numericAmount > 0
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numericAmount)
    : "Valor não informado";
  const demoPayload = `SOCIALTRADE_PIX_DEMO|NAO_PAGAVEL|valor=${Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : "0.00"}`;

  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-primary/25 bg-primary/5 p-5">
      <div className="space-y-2">
        <Label htmlFor="pix-demo-amount">Valor da doação em reais</Label>
        <Input id="pix-demo-amount" inputMode="decimal" placeholder="Ex.: 25,00" value={amount} onChange={(event) => { setAmount(event.target.value); setAmountError(null); }} aria-invalid={amountError ? true : undefined} aria-describedby={amountError ? "pix-demo-amount-error" : undefined} />
        <FieldError id="pix-demo-amount-error">{amountError}</FieldError>
      </div>
      <div className="mt-4 flex justify-center">
        <PaymentQrTrigger requiresProject={requiresProject} requiresAmount={parseDonationAmount(amount) === null} amountHint="Digite um valor válido em reais!" disabled={false} onMissingProject={onMissingProject} onMissingAmount={() => {
          setAmountError(amount.trim() ? "Informe um valor válido para o campo “Valor da doação em reais”." : "Preencha o campo “Valor da doação em reais” para continuar.");
          focusField("pix-demo-amount");
        }} onClick={() => setOpen(true)}>Visualizar QR Code</PaymentQrTrigger>
      </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" aria-label="Pix em preparação">
        <DialogHeader>
          <DialogTitle>Pix · arrecadação em preparação</DialogTitle>
          <DialogDescription>Esta prévia mostra como será a etapa de pagamento. A conta de arrecadação ainda não está conectada.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed" role="alert" data-testid="pix-demo-warning">
            <strong>QR de demonstração — não é um código Pix válido.</strong> Não escaneie para pagar. Nenhuma transferência ou confirmação será iniciada nesta etapa.
          </div>
          <p className="text-center text-sm font-medium">{formattedAmount}</p>
          <div className="mx-auto w-fit rounded-xl bg-white p-3 shadow-sm" data-testid="pix-demo-qr" data-payload={demoPayload}>
            <QRCodeSVG value={demoPayload} size={220} level="M" title="QR code de demonstração, não pagável" />
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground" role="status">
            <Clock3 className="size-4 shrink-0" />
            A confirmação em tempo real será ativada quando a conta Pix e o provedor de arrecadação forem configurados.
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
