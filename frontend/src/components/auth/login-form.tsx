"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, HeartHandshake, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AccountIntent, Catalog, LoginResponse } from "@/lib/types";
import { digits, safeNextPath } from "./validation";

const accountOptions = [
  { value: "donor" as const, label: "Empresa", icon: Building2 },
  { value: "project" as const, label: "Projeto social", icon: HeartHandshake },
  { value: "person" as const, label: "Pessoa", icon: UserRound },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const requestedType = searchParams.get("tipo");
  const [intent, setIntent] = useState<AccountIntent>(requestedType === "donor" || requestedType === "person" ? requestedType : "project");
  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [demoEnabled, setDemoEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api<Catalog & { demo_users_enabled?: boolean }>("/api/catalog").then(result => { if (active) setDemoEnabled(result.demo_users_enabled === true); }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const number = digits(document);
    if (intent === "donor" ? number.length !== 14 : intent === "person" ? number.length !== 11 : ![11, 14].includes(number.length)) nextErrors.document = intent === "donor" ? "Informe o CNPJ com 14 dígitos." : intent === "person" ? "Informe o CPF com 11 dígitos." : "Informe seu CPF (11 dígitos) ou CNPJ (14 dígitos).";
    if (!password) nextErrors.password = "Informe sua senha.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { requestAnimationFrame(() => window.document.getElementById(Object.keys(nextErrors)[0])?.focus()); return; }
    setPending(true);
    try {
      const result = await api<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ document: number, password, account_type: intent === "donor" ? "donor" : "project" }) });
      auth.login(result);
      toast.success("Você entrou na SocialTrade.");
      router.replace(safeNextPath(searchParams.get("proximo")));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente.";
      setErrors({ form: message });
      toast.error(message);
    } finally { setPending(false); }
  }

  return (
    <div>
      <p className="eyebrow mb-3">Bom ter você aqui</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">Entre para fazer parte.</h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">Acesse sua conta e continue de onde parou.</p>
      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-6" aria-busy={pending}>
        <fieldset disabled={pending}>
          <legend className="mb-3 text-sm font-medium">Como você participa?</legend>
          <div className="grid grid-cols-3 gap-2">
            {accountOptions.map(({ value, label, icon: Icon }) => <label key={value} className={cn("relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-2 py-4 text-center text-xs transition-colors sm:text-sm", intent === value ? "border-primary bg-accent text-primary ring-1 ring-primary" : "bg-card text-muted-foreground hover:border-primary/40")}><input type="radio" name="account_type" value={value} checked={intent === value} onChange={() => { setIntent(value); setErrors({}); }} className="peer sr-only" /><Icon className="size-5" strokeWidth={1.6} /><span className="font-medium">{label}</span><span className="absolute inset-0 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring" /></label>)}
          </div>
        </fieldset>
        {errors.form && <Alert variant="destructive" role="alert"><AlertTitle>Não foi possível entrar</AlertTitle><AlertDescription>{errors.form}</AlertDescription></Alert>}
        <div>
          <Label htmlFor="document" className="mb-2">{intent === "donor" ? "CNPJ da empresa" : intent === "person" ? "Seu CPF" : "CPF ou CNPJ"}</Label>
          <Input id="document" name="document" type="text" inputMode="numeric" autoComplete="username" placeholder={intent === "donor" ? "00.000.000/0000-00" : intent === "person" ? "000.000.000-00" : "Documento cadastrado"} maxLength={18} value={document} onChange={event => setDocument(event.target.value)} disabled={pending} aria-invalid={!!errors.document} aria-describedby={errors.document ? "document-error" : undefined} className="h-12" />
          {errors.document && <p id="document-error" className="mt-2 text-sm text-destructive">{errors.document}</p>}
        </div>
        <div>
          <Label htmlFor="password" className="mb-2">Senha</Label>
          <div className="relative"><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" value={password} onChange={event => setPassword(event.target.value)} maxLength={128} disabled={pending} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className="h-12 pr-12" /><Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-1 top-1 size-10 text-muted-foreground">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div>
          {errors.password && <p id="password-error" className="mt-2 text-sm text-destructive">{errors.password}</p>}
        </div>
        <Button type="submit" disabled={pending} className="h-12 w-full text-sm">{pending ? <><LoaderCircle className="size-4 animate-spin" /> Entrando...</> : <>Entrar na minha conta <ArrowRight className="size-4" /></>}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Ainda não tem conta? <Link href={`/cadastro?tipo=${intent}`} className="font-semibold text-primary underline-offset-4 hover:underline">Comece por aqui</Link></p>
      {demoEnabled && <details className="mt-8 rounded-xl border bg-muted/40 p-4 text-sm"><summary className="cursor-pointer font-medium">Ambiente de demonstração</summary><div className="mt-3 space-y-2 leading-relaxed text-muted-foreground"><p>Use os dados abaixo apenas para conhecer o ambiente local.</p><p><strong className="text-foreground">Projeto ou pessoa:</strong> 11111111111</p><p><strong className="text-foreground">Empresa:</strong> 12345678000195</p><p><strong className="text-foreground">Senha:</strong> SocialTrade123!</p></div></details>}
    </div>
  );
}
