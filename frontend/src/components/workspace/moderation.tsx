"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Headset,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/catalog";
import type {
  MessageResponse,
  ModerationOverview,
  TicketStatus,
  PixReviewCandidate,
} from "@/lib/types";
import { ticketLabels, TicketStatusBadge } from "./account";
import {
  EmptyState,
  FormError,
  useSessionRequest,
  useWorkspaceResource,
  WorkspaceError,
  WorkspaceHeading,
  WorkspaceLoading,
} from "./shared";

export function ModerationPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== "moderator")
    return (
      <EmptyState
        title="Área de moderação"
        description="Esta área está disponível para a equipe de moderação da plataforma."
        icon={<ShieldCheck className="size-6" />}
        action={
          <Button asChild variant="outline">
            <Link href="/painel">Voltar ao painel</Link>
          </Button>
        }
      />
    );
  return <ModeratorWorkspace />;
}

function ModeratorWorkspace() {
  const overview = useWorkspaceResource<ModerationOverview>(
    "/api/moderation/overview",
  );
  const pixReview = useWorkspaceResource<PixReviewCandidate[]>(
    "/api/moderation/projects/pix-review",
  );
  const request = useSessionRequest();
  const [busyTicket, setBusyTicket] = useState<number | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const ticketLock = useRef(false);
  const publishLock = useRef(false);
  const [busyPix, setBusyPix] = useState<number | null>(null);
  const pixLock = useRef(false);
  async function reviewPix(candidate: PixReviewCandidate, verified: boolean) {
    if (pixLock.current) return;
    pixLock.current = true;
    setBusyPix(candidate.id);
    try {
      await request(`/api/moderation/projects/${candidate.id}/pix-verification`, {
        method: "PATCH",
        body: JSON.stringify({ verified }),
      });
      toast.success(verified ? "Chave Pix habilitada para doações." : "Habilitação da chave Pix revogada.");
      pixReview.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a revisão Pix.");
    } finally {
      pixLock.current = false;
      setBusyPix(null);
    }
  }
  async function updateTicket(id: number, status: TicketStatus) {
    if (ticketLock.current) return;
    ticketLock.current = true;
    setBusyTicket(id);
    setTicketError(null);
    try {
      await request<MessageResponse>(`/api/moderation/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Status atualizado.");
      overview.reload();
    } catch (reason) {
      setTicketError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar a solicitação.",
      );
    } finally {
      ticketLock.current = false;
      setBusyTicket(null);
    }
  }
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishLock.current) return;
    publishLock.current = true;
    const element = event.currentTarget;
    const form = new FormData(element);
    setPublishing(true);
    setPublishError(null);
    try {
      await request<MessageResponse>("/api/moderation/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title")).trim(),
          body: String(form.get("body")).trim(),
          category: String(form.get("category")).trim() || "plataforma",
        }),
      });
      element.reset();
      toast.success("Aviso publicado para a comunidade.");
    } catch (reason) {
      setPublishError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível publicar o aviso.",
      );
    } finally {
      publishLock.current = false;
      setPublishing(false);
    }
  }
  const stats = overview.data
    ? [
        {
          label: "Contas cadastradas",
          value: overview.data.counts.users,
          icon: UsersRound,
        },
        {
          label: "Organizações",
          value: overview.data.counts.organizations,
          icon: Building2,
        },
        {
          label: "Solicitações em aberto",
          value: overview.data.counts.open_tickets,
          icon: Headset,
        },
      ]
    : [];
  return (
    <>
      <WorkspaceHeading
        eyebrow="Cuidado com a comunidade"
        title="Moderação."
        description="Acompanhe as solicitações de suporte e publique orientações para quem faz parte da SocialTrade."
      />
      {overview.loading && !overview.data ? (
        <WorkspaceLoading />
      ) : overview.error ? (
        <WorkspaceError message={overview.error} retry={overview.reload} />
      ) : (
        <>
          <div className="mb-7 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex justify-between gap-3 rounded-2xl border bg-card p-5"
              >
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                </div>
                <stat.icon className="size-5 text-primary" />
              </div>
            ))}
          </div>
          <section className="surface mb-8">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Conferência de chaves Pix</h2>
            </div>
            <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Confira os documentos do projeto e confirme por canal confiável que a conta de recebimento pertence à organização. A marcação registra uma revisão humana; ela não consulta o banco automaticamente.
            </p>
            {pixReview.loading && !pixReview.data ? (
              <p role="status" className="text-sm text-muted-foreground">Carregando projetos que informaram chave Pix…</p>
            ) : pixReview.error ? (
              <WorkspaceError message={pixReview.error} retry={pixReview.reload} />
            ) : pixReview.data?.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {pixReview.data.map((candidate) => {
                  const verified = Boolean(candidate.pix_key_verified_at);
                  return (
                    <article key={candidate.id} className="rounded-xl border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><h3 className="font-semibold">{candidate.name}</h3><p className="mt-1 text-xs text-muted-foreground">CNPJ {candidate.cnpj || "não informado"} · responsável: {candidate.owner_name}</p></div>
                        <span className="rounded-full border px-3 py-1 text-xs">{verified ? "Chave habilitada" : "Aguardando conferência"}</span>
                      </div>
                      <p className="mt-4 text-xs font-medium text-muted-foreground">Chave Pix privada</p>
                      <code className="mt-1 block break-all rounded-lg bg-muted/50 p-3 text-sm">{candidate.pix_key || "Chave não informada"}</code>
                      <Button type="button" variant={verified ? "outline" : "default"} className="mt-4" disabled={busyPix === candidate.id || !candidate.cnpj || !candidate.pix_key} onClick={() => void reviewPix(candidate, !verified)}>
                        {verified ? <ShieldCheck className="size-4" /> : <CheckCircle2 className="size-4" />}
                        {busyPix === candidate.id ? "Salvando…" : verified ? "Revogar habilitação" : "Confirmar conferência e habilitar"}
                      </Button>
                      {(!candidate.cnpj || !candidate.pix_key) && <p className="mt-2 text-xs text-muted-foreground">O projeto precisa completar o CNPJ e a chave antes da revisão.</p>}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum projeto informou uma chave Pix.</p>
            )}
          </section>
          <div className="grid items-start gap-7 xl:grid-cols-[1.25fr_1fr]">
            <section>
              <div className="mb-5 flex items-center gap-3">
                <Headset className="size-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  Solicitações de suporte
                </h2>
              </div>
              <FormError message={ticketError} />
              {overview.data?.tickets.length ? (
                <div className="mt-4 space-y-4">
                  {overview.data.tickets.map((ticket) => (
                    <article key={ticket.id} className="surface">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          #{ticket.id} · {formatDate(ticket.created_at)}
                        </span>
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                      <h3 className="text-lg font-semibold">
                        {ticket.subject}
                      </h3>
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        {ticket.full_name} · {ticket.email}
                      </p>
                      <p className="my-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                        {ticket.message}
                      </p>
                      <Label htmlFor={`ticket-status-${ticket.id}`}>
                        Status da solicitação #{ticket.id}
                      </Label>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) =>
                          void updateTicket(ticket.id, value as TicketStatus)
                        }
                        disabled={busyTicket !== null}
                      >
                        <SelectTrigger
                          id={`ticket-status-${ticket.id}`}
                          className="mt-2 w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ticketLabels) as TicketStatus[]).map(
                            (status) => (
                              <SelectItem key={status} value={status}>
                                {ticketLabels[status]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      {busyTicket === ticket.id && (
                        <p
                          role="status"
                          className="mt-2 text-xs text-muted-foreground"
                        >
                          Atualizando status…
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma solicitação por aqui"
                  description="As mensagens enviadas pelo suporte aparecerão nesta área para atendimento."
                  icon={<Headset className="size-6" />}
                />
              )}
            </section>
            <section className="surface">
              <div className="mb-5 flex items-center gap-3">
                <Megaphone className="size-5 text-primary" />
                <h2 className="text-xl font-semibold">Publicar aviso</h2>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                O comunicado ficará disponível para todas as pessoas com uma
                conta na plataforma.
              </p>
              <form onSubmit={publish} className="space-y-5">
                <div>
                  <Label htmlFor="announcement-title">Título</Label>
                  <Input
                    id="announcement-title"
                    name="title"
                    minLength={4}
                    maxLength={160}
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="announcement-category">Categoria</Label>
                  <Input
                    id="announcement-category"
                    name="category"
                    defaultValue="plataforma"
                    maxLength={40}
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="announcement-body">Mensagem</Label>
                  <Textarea
                    id="announcement-body"
                    name="body"
                    minLength={10}
                    maxLength={3000}
                    rows={7}
                    required
                    className="mt-2"
                  />
                </div>
                <FormError message={publishError} />
                <Button type="submit" disabled={publishing}>
                  <Megaphone className="size-4" />
                  {publishing ? "Publicando…" : "Publicar aviso"}
                </Button>
              </form>
              <Link
                href="/painel/avisos"
                className="mt-5 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Consultar avisos publicados
              </Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
