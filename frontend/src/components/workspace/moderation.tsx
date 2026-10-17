"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Building2, LifeBuoy, Megaphone, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/catalog";
import type { MessageResponse, ModerationOverview, TicketStatus } from "@/lib/types";
import { ticketLabels, TicketStatusBadge } from "./account";
import { EmptyState, FormError, useSessionRequest, useWorkspaceResource, WorkspaceError, WorkspaceHeading, WorkspaceLoading } from "./shared";

export function ModerationPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== "moderator") return <EmptyState title="Área de moderação" description="Esta área está disponível para a equipe de moderação da plataforma." icon={<ShieldCheck className="size-6" />} action={<Button asChild variant="outline"><Link href="/painel">Voltar ao painel</Link></Button>} />;
  return <ModeratorWorkspace />;
}

function ModeratorWorkspace() {
  const overview = useWorkspaceResource<ModerationOverview>("/api/moderation/overview");
  const request = useSessionRequest();
  const [busyTicket, setBusyTicket] = useState<number | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const ticketLock = useRef(false);
  const publishLock = useRef(false);
  async function updateTicket(id: number, status: TicketStatus) {
    if (ticketLock.current) return;
    ticketLock.current = true;
    setBusyTicket(id); setTicketError(null);
    try {
      await request<MessageResponse>(`/api/moderation/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success("Status atualizado."); overview.reload();
    } catch (reason) { setTicketError(reason instanceof Error ? reason.message : "Não foi possível atualizar a solicitação."); }
    finally { ticketLock.current = false; setBusyTicket(null); }
  }
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishLock.current) return;
    publishLock.current = true;
    const element = event.currentTarget;
    const form = new FormData(element);
    setPublishing(true); setPublishError(null);
    try {
      await request<MessageResponse>("/api/moderation/announcements", { method: "POST", body: JSON.stringify({ title: String(form.get("title")).trim(), body: String(form.get("body")).trim(), category: String(form.get("category")).trim() || "plataforma" }) });
      element.reset(); toast.success("Aviso publicado para a comunidade.");
    } catch (reason) { setPublishError(reason instanceof Error ? reason.message : "Não foi possível publicar o aviso."); }
    finally { publishLock.current = false; setPublishing(false); }
  }
  const stats = overview.data ? [
    { label: "Contas cadastradas", value: overview.data.counts.users, icon: UsersRound },
    { label: "Organizações", value: overview.data.counts.organizations, icon: Building2 },
    { label: "Solicitações em aberto", value: overview.data.counts.open_tickets, icon: LifeBuoy },
  ] : [];
  return <><WorkspaceHeading eyebrow="Cuidado com a comunidade" title="Moderação." description="Acompanhe as solicitações de suporte e publique orientações para quem faz parte da SocialTrade." />{overview.loading && !overview.data ? <WorkspaceLoading /> : overview.error ? <WorkspaceError message={overview.error} retry={overview.reload} /> : <>
    <div className="mb-7 grid gap-4 sm:grid-cols-3">{stats.map(stat => <div key={stat.label} className="flex justify-between gap-3 rounded-2xl border bg-card p-5"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value}</p></div><stat.icon className="size-5 text-primary" /></div>)}</div>
    <div className="grid items-start gap-7 xl:grid-cols-[1.25fr_1fr]"><section><div className="mb-5 flex items-center gap-3"><LifeBuoy className="size-5 text-primary" /><h2 className="text-xl font-semibold">Solicitações de suporte</h2></div><FormError message={ticketError} />{overview.data?.tickets.length ? <div className="mt-4 space-y-4">{overview.data.tickets.map(ticket => <article key={ticket.id} className="surface"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">#{ticket.id} · {formatDate(ticket.created_at)}</span><TicketStatusBadge status={ticket.status} /></div><h3 className="text-lg font-semibold">{ticket.subject}</h3><p className="mt-2 break-words text-xs text-muted-foreground">{ticket.full_name} · {ticket.email}</p><p className="my-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{ticket.message}</p><Label htmlFor={`ticket-status-${ticket.id}`}>Status da solicitação #{ticket.id}</Label><Select value={ticket.status} onValueChange={value => void updateTicket(ticket.id, value as TicketStatus)} disabled={busyTicket !== null}><SelectTrigger id={`ticket-status-${ticket.id}`} className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(ticketLabels) as TicketStatus[]).map(status => <SelectItem key={status} value={status}>{ticketLabels[status]}</SelectItem>)}</SelectContent></Select>{busyTicket === ticket.id && <p role="status" className="mt-2 text-xs text-muted-foreground">Atualizando status…</p>}</article>)}</div> : <EmptyState title="Nenhuma solicitação por aqui" description="As mensagens enviadas pelo suporte aparecerão nesta área para atendimento." icon={<LifeBuoy className="size-6" />} />}</section>
    <section className="surface"><div className="mb-5 flex items-center gap-3"><Megaphone className="size-5 text-primary" /><h2 className="text-xl font-semibold">Publicar aviso</h2></div><p className="mb-6 text-sm leading-relaxed text-muted-foreground">O comunicado ficará disponível para todas as pessoas com uma conta na plataforma.</p><form onSubmit={publish} className="space-y-5"><div><Label htmlFor="announcement-title">Título</Label><Input id="announcement-title" name="title" minLength={4} maxLength={160} required className="mt-2" /></div><div><Label htmlFor="announcement-category">Categoria</Label><Input id="announcement-category" name="category" defaultValue="plataforma" maxLength={40} required className="mt-2" /></div><div><Label htmlFor="announcement-body">Mensagem</Label><Textarea id="announcement-body" name="body" minLength={10} maxLength={3000} rows={7} required className="mt-2" /></div><FormError message={publishError} /><Button type="submit" disabled={publishing}><Megaphone className="size-4" />{publishing ? "Publicando…" : "Publicar aviso"}</Button></form><Link href="/painel/avisos" className="mt-5 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">Consultar avisos publicados</Link></section></div>
  </>}</>;
}
