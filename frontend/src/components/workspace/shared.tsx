"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Inbox,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";

export function useSessionRequest() {
  const { token, expireSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      try {
        return await api<T>(path, { ...options, token });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          expireSession(token)
        ) {
          toast.error("Sua sessão expirou. Entre novamente para continuar.", {
            id: "session-expired",
          });
          router.replace(`/entrar?proximo=${encodeURIComponent(pathname)}`);
        }
        throw error;
      }
    },
    [token, expireSession, router, pathname],
  );
}

export function useWorkspaceResource<T>(path: string) {
  const request = useSessionRequest();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    request<T>(path, { signal: controller.signal })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar os dados.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, request, version]);
  return { data, loading, error, reload };
}

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function WorkspaceLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando conteúdo">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  );
}

export function WorkspaceError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 sm:p-8"
    >
      <AlertCircle className="mb-4 size-6 text-destructive" />
      <h2 className="text-xl font-semibold">
        Não conseguimos carregar esta página
      </h2>
      <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Button type="button" variant="outline" className="mt-5" onClick={retry}>
        <RefreshCw className="size-4" />
        Tentar novamente
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-8 text-center sm:p-12">
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon || <Inbox className="size-6" />}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SubmitLabel({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <ArrowRight className="size-4" />
      )}
      {pending ? "Salvando…" : children}
    </>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm leading-relaxed text-destructive"
    >
      {message}
    </p>
  );
}
