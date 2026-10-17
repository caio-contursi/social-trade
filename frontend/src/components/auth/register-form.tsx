"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Eye, EyeOff, HeartHandshake, Info, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { areaLabels, brazilStates, organizationLabels } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { AccountIntent, MessageResponse } from "@/lib/types";
import { digits, validCnpj, validCpf } from "./validation";

const initialValues = { full_name: "", document: "", email: "", phone: "", password: "", password_confirmation: "", username: "", responsible_title: "", name: "", organization_type: "", city: "", state: "", short_description: "", objective: "", impact_summary: "", member_project_id: "", member_role: "" };
type FieldName = keyof typeof initialValues;
interface OpenProject { id: number; name: string; city: string; state: string; }
const intentions = [
  { value: "donor" as const, title: "Quero apoiar", caption: "Sou uma empresa doadora", description: "Conheça projetos e encontre causas alinhadas à sua empresa.", icon: Building2 },
  { value: "project" as const, title: "Sou um projeto social", caption: "Represento uma iniciativa ou organização", description: "Apresente sua atuação, seus objetivos e os resultados do seu projeto.", icon: HeartHandshake },
  { value: "person" as const, title: "Quero participar", caption: "Sou uma pessoa", description: "Crie sua matrícula e, se desejar, vincule-se a um projeto social.", icon: UserRound },
];

export function RegisterForm() {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("tipo");
  const [intent, setIntent] = useState<AccountIntent>(requestedType === "donor" || requestedType === "person" ? requestedType : "project");
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(initialValues);
  const [areas, setAreas] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<MessageResponse | null>(null);
  const [projects, setProjects] = useState<OpenProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    api<OpenProject[]>("/api/projects/open").then(result => { if (active) setProjects(result); }).catch(() => { if (active) setProjectsError(true); }).finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (step > 1 || success) headingRef.current?.focus(); }, [step, success]);

  function updateField(name: FieldName, value: string) {
    if (name === "member_project_id" && value === "none") value = "";
    setValues(previous => ({ ...previous, [name]: value }));
    setErrors(previous => { const next = { ...previous }; delete next[name]; delete next.form; return next; });
  }

  function validate(currentStep: number) {
    const next: Record<string, string> = {};
    if (currentStep === 2) {
      if (values.full_name.trim().length < 2) next.full_name = "Informe seu nome completo (ao menos 2 caracteres).";
      if (!(intent === "person" ? validCpf(values.document) : validCnpj(values.document))) next.document = intent === "person" ? "Informe um CPF válido." : "Informe um CNPJ válido.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Informe um e-mail válido.";
      if (values.password.length < 10) next.password = "Crie uma senha com ao menos 10 caracteres.";
      if (values.password_confirmation !== values.password || !values.password_confirmation) next.password_confirmation = "As senhas precisam ser iguais.";
    }
    if (currentStep === 3 && intent === "person") {
      if (!/^[a-z0-9_]{3,30}$/.test(values.username.trim().toLowerCase())) next.username = "Use de 3 a 30 caracteres: letras sem acento, números ou sublinhado.";
      if (values.responsible_title.trim().length < 2) next.responsible_title = "Informe sua ocupação ou como você participa de ações sociais.";
      if (values.member_project_id && !values.member_role) next.member_role = "Selecione como você participa deste projeto.";
    }
    if (currentStep === 3 && intent !== "person") {
      if (values.name.trim().length < 2) next.name = "Informe o nome da organização.";
      if (intent === "project" && !values.organization_type) next.organization_type = "Selecione o tipo de organização.";
      if (values.city.trim().length < 2) next.city = "Informe a cidade da organização.";
      if (!brazilStates.includes(values.state)) next.state = "Selecione um estado.";
      if (values.short_description.trim().length < 10) next.short_description = "Escreva uma apresentação com ao menos 10 caracteres.";
      if (intent === "project") {
        if (!areas.length) next.areas = "Selecione ao menos uma área de atuação.";
        if (!values.objective.trim()) next.objective = "Conte qual é o objetivo do projeto.";
        if (!values.impact_summary.trim()) next.impact_summary = "Conte quais ações e resultados o projeto já apresenta.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length) requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus());
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate(step)) return;
    if (step < 3) { setStep(step + 1); return; }
    setPending(true);
    const access = { full_name: values.full_name.trim(), document: digits(values.document), email: values.email.trim(), phone: values.phone.trim() || null, password: values.password, password_confirmation: values.password_confirmation };
    const payload = intent === "person" ? {
      ...access, username: values.username.trim().toLowerCase(), responsible_title: values.responsible_title.trim(), role: "member",
      member_project_id: values.member_project_id ? Number(values.member_project_id) : null, member_role: values.member_project_id ? values.member_role : null,
    } : {
      ...access, institution_kind: intent,
      organization: { name: values.name.trim(), organization_type: intent === "donor" ? "company" : values.organization_type, institution_kind: intent, cnpj: digits(values.document), city: values.city.trim(), state: values.state, short_description: values.short_description.trim(), objective: intent === "project" ? values.objective.trim() : null, impact_summary: intent === "project" ? values.impact_summary.trim() : null, areas: intent === "project" ? areas : [], interested_services: [] },
    };
    try {
      const result = await api<MessageResponse>(intent === "person" ? "/api/auth/register" : "/api/auth/register-institution", { method: "POST", body: JSON.stringify(payload) });
      setSuccess(result);
      setValues(previous => ({ ...previous, password: "", password_confirmation: "" }));
      toast.success("Sua conta foi criada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar sua conta. Tente novamente.";
      setErrors({ form: message });
      toast.error(message);
      requestAnimationFrame(() => document.getElementById("registration-error")?.focus());
    } finally { setPending(false); }
  }

  function field(name: FieldName, label: string, options: React.ComponentProps<typeof Input> & { help?: string } = {}) {
    const { help, className, ...inputOptions } = options;
    return <div><Label htmlFor={name} className="mb-2">{label}</Label><Input {...inputOptions} id={name} name={name} value={values[name]} disabled={pending} onChange={event => updateField(name, event.target.value)} aria-invalid={!!errors[name]} aria-describedby={[help ? `${name}-help` : "", errors[name] ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined} className={cn("h-11", className)} />{help && <p id={`${name}-help`} className="mt-2 text-xs leading-relaxed text-muted-foreground">{help}</p>}{errors[name] && <p id={`${name}-error`} className="mt-2 text-sm text-destructive">{errors[name]}</p>}</div>;
  }

  function selectField(name: FieldName, label: string, placeholder: string, options: { value: string; label: string }[]) {
    return <div><Label htmlFor={name} className="mb-2">{label}</Label><Select value={values[name]} onValueChange={value => updateField(name, value)} disabled={pending}><SelectTrigger id={name} className="h-11 w-full" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>{errors[name] && <p id={`${name}-error`} className="mt-2 text-sm text-destructive">{errors[name]}</p>}</div>;
  }

  function textareaField(name: "short_description" | "objective" | "impact_summary", label: string, placeholder: string, maxLength: number, help?: string) {
    return <div><Label htmlFor={name} className="mb-2">{label}</Label><Textarea id={name} name={name} value={values[name]} onChange={event => updateField(name, event.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3} disabled={pending} aria-invalid={!!errors[name]} aria-describedby={[help ? `${name}-help` : "", errors[name] ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined} className="resize-y" /><div className="mt-2 flex justify-between gap-3">{help && <p id={`${name}-help`} className="text-xs leading-relaxed text-muted-foreground">{help}</p>}<span className="ml-auto shrink-0 text-xs text-muted-foreground">{values[name].length}/{maxLength}</span></div>{errors[name] && <p id={`${name}-error`} className="mt-2 text-sm text-destructive">{errors[name]}</p>}</div>;
  }

  if (success) return <div className="py-10"><div className="mb-6 flex size-16 items-center justify-center rounded-full bg-accent text-primary"><CheckCircle2 className="size-8" strokeWidth={1.6} /></div><p className="eyebrow mb-3">Um novo começo</p><h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">Sua conta está pronta.</h1><p className="mt-4 leading-relaxed text-muted-foreground">{success.message}</p>{success.registration_number && <div className="my-6 rounded-2xl border bg-muted/50 p-6"><p className="text-sm text-muted-foreground">Sua matrícula SocialTrade</p><p className="mt-2 font-display text-3xl font-semibold tracking-widest">{success.registration_number}</p><p className="mt-3 text-sm text-muted-foreground">Guarde este número. Para entrar, use seu CPF e sua senha.</p></div>}<Button asChild className="mt-8 h-12 w-full"><Link href={`/entrar?tipo=${intent}`}>Entrar na minha conta <ArrowRight className="size-4" /></Link></Button></div>;

  return <div>
    <div className="mb-8 flex items-center gap-3" aria-label={`Etapa ${step} de 3`}>
      {["Seu perfil", "Seu acesso", "Sua apresentação"].map((label, index) => <div key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={step === index + 1 ? "step" : undefined}><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", step >= index + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{step > index + 1 ? <Check className="size-3.5" /> : index + 1}</span><span className={cn("hidden text-xs sm:block", step === index + 1 ? "font-semibold" : "text-muted-foreground")}>{label}</span>{index < 2 && <span className="h-px flex-1 bg-border" />}</div>)}
    </div>
    <p className="eyebrow mb-3">Etapa {step} de 3</p>
    <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">{step === 1 ? "Vamos fazer a diferença?" : step === 2 ? "Primeiro, seu acesso." : intent === "person" ? "Conte um pouco de você." : "Apresente sua organização."}</h1>
    <p className="mt-3 leading-relaxed text-muted-foreground">{step === 1 ? "Escolha como você quer fazer parte da SocialTrade." : step === 2 ? intent === "person" ? "Use seus dados pessoais para criar sua conta." : "Informe os dados da instituição e de quem será responsável pela conta." : intent === "person" ? "Defina seu usuário e escolha se deseja se vincular a um projeto." : "Essas informações ajudam outras pessoas a conhecer sua atuação."}</p>
    <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-6" aria-busy={pending}>
      {errors.form && <Alert variant="destructive" role="alert" tabIndex={-1} id="registration-error"><AlertTitle>Revise seu cadastro</AlertTitle><AlertDescription>{errors.form} Você pode voltar às etapas anteriores para corrigir os dados.</AlertDescription></Alert>}
      {step === 1 && <fieldset className="space-y-3"><legend className="sr-only">Escolha o tipo de conta</legend>{intentions.map(({ value, title, caption, description, icon: Icon }) => <label key={value} className={cn("relative flex cursor-pointer gap-4 rounded-2xl border p-4 transition-colors sm:p-5", intent === value ? "border-primary bg-accent/70 ring-1 ring-primary" : "bg-card hover:border-primary/40")}><input type="radio" name="intent" value={value} checked={intent === value} onChange={() => { setIntent(value); setErrors({}); }} className="peer sr-only" /><div className={cn("mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl", intent === value ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}><Icon className="size-5" strokeWidth={1.7} /></div><div className="pr-4"><p className="font-display text-base font-semibold">{title}</p><p className="mt-0.5 text-xs font-medium text-primary">{caption}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div><span className={cn("absolute right-4 top-5 flex size-4 items-center justify-center rounded-full border", intent === value ? "border-primary bg-primary text-primary-foreground" : "border-input")}>{intent === value && <Check className="size-3" />}</span><span className="absolute inset-0 rounded-2xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring" /></label>)}</fieldset>}
      {step === 2 && <>
        {field("full_name", intent === "person" ? "Nome completo" : "Nome completo do responsável", { autoComplete: "name", maxLength: 120, placeholder: "Como você se chama?" })}
        {field("document", intent === "person" ? "CPF" : "CNPJ da instituição", { inputMode: "numeric", autoComplete: "off", maxLength: 18, placeholder: intent === "person" ? "000.000.000-00" : "00.000.000/0000-00", help: intent === "person" ? "Você usará seu CPF para entrar na plataforma." : "O CNPJ será o documento de acesso da instituição." })}
        <div className="grid gap-6 sm:grid-cols-2">{field("email", "E-mail", { type: "email", autoComplete: "email", placeholder: "voce@exemplo.com", maxLength: 254 })}{field("phone", "Telefone (opcional)", { type: "tel", autoComplete: "tel", placeholder: "(11) 99999-9999", maxLength: 30 })}</div>
        <div><div className="mb-2 flex items-center justify-between gap-3"><Label htmlFor="password">Crie uma senha</Label><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar senhas" : "Mostrar senhas"} aria-pressed={visible} className="inline-flex items-center gap-1.5 rounded text-xs text-muted-foreground hover:text-foreground">{visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{visible ? "Ocultar" : "Mostrar"}</button></div><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" value={values.password} onChange={event => updateField("password", event.target.value)} minLength={10} maxLength={128} className="h-11" aria-invalid={!!errors.password} aria-describedby={`password-help${errors.password ? " password-error" : ""}`} /><p id="password-help" className="mt-2 text-xs text-muted-foreground">Use ao menos 10 caracteres. Prefira uma senha que você ainda não utiliza.</p>{errors.password && <p id="password-error" className="mt-2 text-sm text-destructive">{errors.password}</p>}</div>
        {field("password_confirmation", "Confirme a senha", { type: visible ? "text" : "password", autoComplete: "new-password", maxLength: 128 })}
      </>}
      {step === 3 && intent === "person" && <>
        {field("username", "Nome de usuário", { autoComplete: "username", maxLength: 30, placeholder: "seu_nome", help: "De 3 a 30 caracteres, usando letras sem acento, números ou sublinhado." })}
        {field("responsible_title", "Ocupação ou participação social", { maxLength: 80, placeholder: "Ex.: professora, voluntário, participante", help: "Conte brevemente como você se apresenta." })}
        <div className="rounded-2xl border bg-muted/40 p-5"><h2 className="font-display text-base font-semibold">Você já participa de um projeto?</h2><p className="mb-4 mt-2 text-sm leading-relaxed text-muted-foreground">Este vínculo é opcional. Você pode criar sua conta sem selecionar um projeto.</p>{projectsLoading ? <p role="status" className="text-sm text-muted-foreground">Carregando os projetos...</p> : projectsError ? <p className="text-sm text-muted-foreground">Não foi possível carregar os projetos agora. Você pode continuar seu cadastro sem vínculo.</p> : projects.length ? <div className="space-y-4">{selectField("member_project_id", "Projeto social (opcional)", "Sem vínculo com projeto", [{ value: "none", label: "Sem vínculo com projeto" }, ...projects.map(project => ({ value: String(project.id), label: `${project.name} · ${project.city}/${project.state}` }))])}{values.member_project_id && values.member_project_id !== "none" && selectField("member_role", "Como você participa?", "Selecione o vínculo", [{ value: "staff", label: "Faço parte da equipe" }, { value: "assisted", label: "Sou uma pessoa assistida" }])}</div> : <p className="text-sm text-muted-foreground">Ainda não há projetos disponíveis para vínculo.</p>}</div>
        <Alert><Info className="size-4" /><AlertTitle>Sua matrícula será gerada automaticamente</AlertTitle><AlertDescription>Ao concluir, você receberá um número de identificação de seis dígitos.</AlertDescription></Alert>
      </>}
      {step === 3 && intent !== "person" && <>
        {field("name", intent === "donor" ? "Nome da empresa" : "Nome do projeto ou organização", { autoComplete: "organization", maxLength: 160, placeholder: intent === "donor" ? "O nome da sua empresa" : "Como seu projeto é conhecido?" })}
        {intent === "project" && selectField("organization_type", "Tipo de organização", "Selecione o tipo", Object.entries(organizationLabels).filter(([code]) => code !== "company").map(([value, label]) => ({ value, label })))}
        <div className="grid grid-cols-[1fr_100px] gap-4">{field("city", "Cidade", { autoComplete: "address-level2", maxLength: 100, placeholder: "Sua cidade" })}{selectField("state", "Estado", "UF", brazilStates.map(value => ({ value, label: value })))}</div>
        {textareaField("short_description", "Apresentação breve", intent === "donor" ? "Conte o que sua empresa faz e como pretende contribuir." : "Conte a quem o projeto atende e o que ele faz.", 280, "De 10 a 280 caracteres. Essa apresentação aparece no perfil da organização.")}
        {intent === "project" && <>
          <fieldset id="areas" tabIndex={-1} aria-describedby={errors.areas ? "areas-error" : "areas-help"} aria-invalid={!!errors.areas}><legend className="mb-2 text-sm font-medium">Áreas de atuação</legend><p id="areas-help" className="mb-4 text-xs text-muted-foreground">Selecione ao menos uma causa à qual o projeto se dedica.</p><div className="grid gap-3 sm:grid-cols-2">{Object.entries(areaLabels).map(([code, label]) => <label key={code} className="flex cursor-pointer items-start gap-2.5 text-sm leading-5"><Checkbox id={`area-${code}`} checked={areas.includes(code)} disabled={pending} onCheckedChange={checked => { setAreas(previous => checked ? [...previous, code] : previous.filter(area => area !== code)); setErrors(previous => { const next = { ...previous }; delete next.areas; return next; }); }} className="mt-0.5" /><span>{label}</span></label>)}</div>{errors.areas && <p id="areas-error" className="mt-3 text-sm text-destructive">{errors.areas}</p>}</fieldset>
          {textareaField("objective", "Quais são os objetivos do projeto?", "Descreva a mudança que vocês querem construir.", 2000)}
          {textareaField("impact_summary", "Quais ações e resultados vocês apresentam?", "Conte o que já foi realizado. Se o projeto está começando, descreva as ações iniciais e o estágio atual.", 2000, "Apresente informações reais. Os resultados são declarados pelo próprio projeto.")}
        </>}
      </>}
      {step === 3 && <p className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">Cadastre informações verdadeiras e dados que você tem autorização para compartilhar. As informações de apresentação da organização poderão ser exibidas em seu perfil público.</p>}
      <div className="flex gap-3 border-t pt-6">
        {step > 1 && <Button type="button" variant="outline" disabled={pending} onClick={() => { setErrors({}); setStep(step - 1); }} className="h-12"><ArrowLeft className="size-4" /> Voltar</Button>}
        <Button type="submit" disabled={pending} className="h-12 flex-1">{pending ? <><LoaderCircle className="size-4 animate-spin" /> Criando sua conta...</> : step === 3 ? <>Criar minha conta <Check className="size-4" /></> : <>Continuar <ArrowRight className="size-4" /></>}</Button>
      </div>
    </form>
    {step === 1 && <p className="mt-6 text-center text-sm text-muted-foreground">Já tem uma conta? <Link href="/entrar" className="font-semibold text-primary underline-offset-4 hover:underline">Entre por aqui</Link></p>}
  </div>;
}
