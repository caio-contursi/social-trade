"use client";

import { useRef, useState } from "react";
import { Bell, CheckCircle2, CircleHelp, MessageSquareText, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/catalog";
import type { Announcement, MessageResponse, Ticket, TicketStatus } from "@/lib/types";
import { EmptyState, FormError, SubmitLabel, useSessionRequest, useWorkspaceResource, WorkspaceError, WorkspaceHeading, WorkspaceLoading } from "./shared";

export const ticketLabels: Record<TicketStatus, string> = { open: "Recebida", in_progress: "Em atendimento", resolved: "Resolvida" };

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant="outline" className={status === "resolved" ? "border-primary/25 bg-primary/10 text-primary" : status === "in_progress" ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground"}>{ticketLabels[status]}</Badge>;
}

export function AccountProfile() {
  const { user, refreshUser } = useAuth();
  const request = useSessionRequest();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submitLock = useRef(false);
  if (!user) return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    const form = new FormData(event.currentTarget);
    setPending(true); setError(null); setSaved(false);
    try {
      await request<MessageResponse>("/api/profile", { method: "PATCH", body: JSON.stringify({ full_name: String(form.get("full_name")).trim(), phone: String(form.get("phone")).trim() || null, responsible_title: String(form.get("responsible_title")).trim() || null }) });
      await refreshUser();
      setSaved(true); toast.success("Sua conta foi atualizada.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar os dados."); }
    finally { submitLock.current = false; setPending(false); }
  }
  return <><WorkspaceHeading eyebrow="Minha conta" title="Cuide dos seus dados." description="Mantenha seus dados de contato atualizados. Eles são usados para identificar sua conta e ajudar no atendimento." /><div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]"><section className="surface"><div className="mb-6 flex items-center gap-3"><UserRound className="size-5 text-primary" /><h2 className="text-xl font-semibold">Informações pessoais</h2></div><form onSubmit={submit} className="space-y-5"><div><Label htmlFor="profile-name">Nome completo</Label><Input id="profile-name" name="full_name" autoComplete="name" defaultValue={user.full_name} minLength={2} maxLength={120} required className="mt-2" /></div><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="profile-phone">Telefone <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="profile-phone" name="phone" type="tel" autoComplete="tel" defaultValue={user.phone || ""} maxLength={30} className="mt-2" /></div><div><Label htmlFor="profile-title">Cargo ou função <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="profile-title" name="responsible_title" defaultValue={user.responsible_title || ""} maxLength={80} className="mt-2" /></div></div><div className="rounded-xl border bg-muted/40 p-4"><p className="text-sm font-medium">E-mail de acesso</p><p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Precisa alterar seu e-mail ou documento? Envie uma solicitação pela área de suporte.</p></div><FormError message={error} />{saved && <p role="status" className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4" />Informações salvas com sucesso.</p>}<Button disabled={pending} type="submit"><SubmitLabel pending={pending}>Salvar alterações</SubmitLabel></Button></form></section><aside className="surface"><p className="eyebrow mb-4">Seu cadastro</p><dl className="space-y-5 text-sm"><div><dt className="text-muted-foreground">Tipo de conta</dt><dd className="mt-1 font-medium">{user.account_type === "donor" ? "Empresa apoiadora" : user.account_type === "project" ? "Projeto social" : "Pessoa física"}</dd></div><div><dt className="text-muted-foreground">Perfil de acesso</dt><dd className="mt-1 font-medium">{user.role_label}</dd></div>{user.registration_number && <div><dt className="text-muted-foreground">Matrícula</dt><dd className="mt-1 font-mono font-medium">{user.registration_number}</dd></div>}</dl><p className="mt-6 border-t pt-5 text-xs leading-relaxed text-muted-foreground">Dados da sua conta são diferentes das informações públicas do projeto ou empresa.</p></aside></div></>;
}

export function AnnouncementsPage() {
  const { data, loading, error, reload } = useWorkspaceResource<Announcement[]>("/api/announcements");
  return <><WorkspaceHeading eyebrow="Fique por dentro" title="Avisos da plataforma." description="Novidades, orientações e comunicados para a comunidade SocialTrade." />{loading ? <WorkspaceLoading /> : error ? <WorkspaceError message={error} retry={reload} /> : data?.length ? <div className="space-y-5">{data.map(notice => <article key={notice.id} className="surface"><div className="mb-4 flex flex-wrap items-center gap-3"><Badge variant="secondary">{notice.category}</Badge><time dateTime={notice.published_at} className="text-xs text-muted-foreground">{formatDate(notice.published_at)}</time></div><h2 className="text-xl font-semibold sm:text-2xl">{notice.title}</h2><p className="mt-4 max-w-3xl whitespace-pre-wrap break-words leading-relaxed text-muted-foreground">{notice.body}</p></article>)}</div> : <EmptyState title="Tudo em dia por aqui" description="Ainda não há avisos publicados. Quando houver novidades, você poderá consultá-las nesta página." icon={<Bell className="size-6" />} />}</>;
}

export function SupportPage() {
  const request = useSessionRequest();
  const tickets = useWorkspaceResource<Ticket[]>("/api/support/mine");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const submitLock = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true); setError(null); setConfirmation(null);
    try {
      const result = await request<MessageResponse>("/api/support", { method: "POST", body: JSON.stringify({ subject: String(form.get("subject")).trim(), message: String(form.get("message")).trim() }) });
      formElement.reset();
      setConfirmation(`Solicitação${result.id ? ` #${result.id}` : ""} recebida. Você pode acompanhar o status abaixo.`);
      toast.success("Sua solicitação foi enviada."); tickets.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar a solicitação."); }
    finally { submitLock.current = false; setPending(false); }
  }
  return <><WorkspaceHeading eyebrow="Estamos por perto" title="Como podemos ajudar?" description="Conte o que aconteceu ou envie sua dúvida. Evite incluir senhas ou outros dados sensíveis na mensagem." /><div className="grid items-start gap-6 xl:grid-cols-[1.1fr_1fr]"><section className="surface"><div className="mb-6 flex items-center gap-3"><CircleHelp className="size-5 text-primary" /><h2 className="text-xl font-semibold">Nova solicitação</h2></div><form onSubmit={submit} className="space-y-5"><div><Label htmlFor="support-subject">Assunto</Label><Input id="support-subject" name="subject" placeholder="Sobre o que você precisa falar?" minLength={4} maxLength={140} required className="mt-2" /></div><div><Label htmlFor="support-message">Sua mensagem</Label><Textarea id="support-message" name="message" rows={7} minLength={10} maxLength={4000} required placeholder="Descreva sua dúvida ou o problema com alguns detalhes." className="mt-2 resize-y" /></div><FormError message={error} />{confirmation && <p role="status" className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm leading-relaxed text-primary">{confirmation}</p>}<Button disabled={pending} type="submit"><Send className="size-4" />{pending ? "Enviando…" : "Enviar solicitação"}</Button></form></section><section><div className="mb-5 flex items-center gap-3"><MessageSquareText className="size-5 text-primary" /><h2 className="text-xl font-semibold">Seu histórico</h2></div>{tickets.loading ? <WorkspaceLoading /> : tickets.error ? <WorkspaceError message={tickets.error} retry={tickets.reload} /> : tickets.data?.length ? <div className="space-y-4">{tickets.data.map(ticket => <article key={ticket.id} className="rounded-2xl border bg-card p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">#{ticket.id} · {formatDate(ticket.created_at)}</span><TicketStatusBadge status={ticket.status} /></div><h3 className="font-semibold">{ticket.subject}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{ticket.message}</p></article>)}</div> : <EmptyState title="Nenhuma solicitação ainda" description="O histórico e o status das mensagens que você enviar aparecerão aqui." icon={<MessageSquareText className="size-6" />} />}</section></div></>;
}
