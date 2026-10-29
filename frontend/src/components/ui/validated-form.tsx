"use client";

import { createContext, useContext, useState } from "react";
import { AlertCircle } from "lucide-react";

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Issue = { message: string; errorId: string };
const ValidationContext = createContext<Record<string, Issue>>({});

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return <p id={id} className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm leading-relaxed text-destructive"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{children}</span></p>;
}

export function useFieldIssue(id?: string) {
  const issues = useContext(ValidationContext);
  return id ? issues[id] : undefined;
}

function isControl(node: EventTarget | null): node is Control {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement;
}

function fieldLabel(field: Control) {
  return (field.getAttribute("aria-label") || Array.from(field.labels || []).map((label) => label.textContent).join(" ") || field.name || "obrigatório")
    .replace(/\*/g, "").replace(/\(opcional\)/gi, "").replace(/\s+/g, " ").trim();
}

function issueFor(field: Control): Issue | undefined {
  if (field.disabled || (field instanceof HTMLInputElement && (field.type === "hidden" || field.readOnly))) return;
  const label = fieldLabel(field);
  const value = field.value.trim();
  let message: string | undefined;
  if (field.required && (!value || ((field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)) && !field.checked))) {
    message = field instanceof HTMLSelectElement ? `Selecione o campo “${label}” para continuar.` : `Preencha o campo “${label}” para continuar.`;
  } else if (value) {
    if ("minLength" in field && field.minLength > 0 && value.length < field.minLength) message = `O campo “${label}” precisa ter ao menos ${field.minLength} caracteres.`;
    else if ("maxLength" in field && field.maxLength > 0 && value.length > field.maxLength) message = `O campo “${label}” deve ter até ${field.maxLength} caracteres.`;
    else if (field.validity.typeMismatch || field.validity.patternMismatch || field.validity.badInput || field.validity.rangeOverflow || field.validity.rangeUnderflow) message = `Informe um valor válido para o campo “${label}”.`;
  }
  return message ? { message, errorId: `${field.id || field.name}-validation-error` } : undefined;
}

export function ValidatedForm({ children, onSubmit, onChange, onBlur, onReset, ...props }: React.ComponentProps<"form">) {
  const [issues, setIssues] = useState<Record<string, Issue>>({});
  const [submitted, setSubmitted] = useState(false);
  function update(field: Control, onlyIfInvalid = false) {
    const key = field.id || field.name;
    if (!key) return;
    const issue = issueFor(field);
    setIssues((previous) => {
      if (onlyIfInvalid && !previous[key]) return previous;
      const next = { ...previous };
      if (issue) next[key] = issue; else delete next[key];
      return next;
    });
  }
  return (
    <ValidationContext.Provider value={issues}>
      <form {...props} noValidate onSubmit={(event) => {
        event.preventDefault();
        const controls = Array.from(event.currentTarget.querySelectorAll<Control>("input, textarea, select"));
        const next: Record<string, Issue> = {};
        let first: Control | undefined;
        for (const field of controls) {
          const issue = issueFor(field);
          const key = field.id || field.name;
          if (issue && key) { next[key] = issue; first ||= field; }
        }
        setIssues(next);
        setSubmitted(Boolean(first));
        if (first) { requestAnimationFrame(() => { if (first?.isConnected) { first.focus(); first.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); } }); return; }
        void onSubmit?.(event);
      }} onChange={(event) => { if (isControl(event.target)) update(event.target, true); onChange?.(event); }} onBlur={(event) => { if (isControl(event.target)) update(event.target); onBlur?.(event); }} onReset={(event) => { setIssues({}); setSubmitted(false); onReset?.(event); }}>
        {submitted && Object.keys(issues).length > 0 && <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Revise os campos destacados para continuar.</div>}
        {children}
      </form>
    </ValidationContext.Provider>
  );
}
