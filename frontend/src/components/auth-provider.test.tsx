import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-provider";
import { ApiError } from "@/lib/api";
import { deferred, jsonResponse, makeSession, makeUser } from "@/test/helpers";

const storageKey = "socialtrade_token";
function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("sessão autenticada", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("inicia deslogado sem consultar a API quando não há token", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recupera a sessão atual e remove o token legado", async () => {
    sessionStorage.setItem(storageKey, "atual");
    localStorage.setItem(storageKey, "legado");
    fetchMock.mockResolvedValueOnce(jsonResponse(makeUser()));
    const { result } = renderHook(useAuth, { wrapper });

    await waitFor(() => expect(result.current.user?.id).toBe(1));
    expect(result.current.loading).toBe(false);
    expect(result.current.token).toBe("atual");
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer atual");
  });

  it("migra um token legado para sessionStorage após validá-lo", async () => {
    localStorage.setItem(storageKey, "legado");
    fetchMock.mockResolvedValueOnce(jsonResponse(makeUser()));
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(makeUser());
    expect(sessionStorage.getItem(storageKey)).toBe("legado");
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("salva o login apenas na sessão e encerra a conta removendo os caches antigos", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    localStorage.setItem(storageKey, "legado");
    localStorage.setItem("socialtrade_user", "dados antigos");

    act(() => result.current.login(makeSession("novo")));
    expect(result.current.user).toEqual(makeUser());
    expect(result.current.token).toBe("novo");
    expect(sessionStorage.getItem(storageKey)).toBe("novo");
    expect(localStorage.getItem(storageKey)).toBeNull();

    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(sessionStorage.getItem(storageKey)).toBeNull();
    expect(localStorage.getItem("socialtrade_user")).toBeNull();
  });

  it("descarta uma sessão expirada durante a recuperação inicial", async () => {
    sessionStorage.setItem(storageKey, "expirado");
    localStorage.setItem("socialtrade_user", "dados antigos");
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Sessão expirada." }, 401));
    const { result } = renderHook(useAuth, { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
    expect(localStorage.getItem("socialtrade_user")).toBeNull();
  });

  it("preserva o token durante indisponibilidade e permite tentar novamente", async () => {
    sessionStorage.setItem(storageKey, "valido");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const { result } = renderHook(useAuth, { wrapper });

    await waitFor(() => expect(result.current.error).toMatch(/Não foi possível conectar/));
    expect(result.current.loading).toBe(false);
    expect(result.current.token).toBe("valido");
    expect(sessionStorage.getItem(storageKey)).toBe("valido");

    fetchMock.mockResolvedValueOnce(jsonResponse(makeUser()));
    await act(async () => { await result.current.retrySession(); });
    expect(result.current.user).toEqual(makeUser());
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it.each([200, 401])("ignora uma recuperação antiga com status %s após um login novo", async (status) => {
    sessionStorage.setItem(storageKey, "antigo");
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const next = makeSession("novo", { id: 2, full_name: "Outra pessoa" });
    act(() => result.current.login(next));
    await act(async () => {
      pending.resolve(jsonResponse(status === 200 ? makeUser() : { detail: "Expirado" }, status));
    });
    expect(result.current.user).toEqual(next.user);
    expect(result.current.token).toBe("novo");
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(sessionStorage.getItem(storageKey)).toBe("novo");
  });

  it("não restaura uma sessão cuja recuperação terminou depois do logout", async () => {
    sessionStorage.setItem(storageKey, "antigo");
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(useAuth, { wrapper });
    act(() => result.current.logout());
    await act(async () => { pending.resolve(jsonResponse(makeUser())); });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("mantém o resultado da tentativa mais recente quando respostas chegam fora de ordem", async () => {
    sessionStorage.setItem(storageKey, "atual");
    const oldest = deferred<Response>();
    fetchMock.mockReturnValueOnce(oldest.promise);
    const { result } = renderHook(useAuth, { wrapper });
    fetchMock.mockResolvedValueOnce(jsonResponse(makeUser({ full_name: "Atualizada" })));
    await act(async () => { await result.current.retrySession(); });
    await act(async () => { oldest.resolve(jsonResponse({ detail: "Expirado" }, 401)); });

    expect(result.current.user?.full_name).toBe("Atualizada");
    expect(result.current.token).toBe("atual");
    expect(result.current.loading).toBe(false);
  });

  it("atualiza os dados da própria sessão", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    act(() => result.current.login(makeSession("atual")));
    fetchMock.mockResolvedValueOnce(jsonResponse(makeUser({ full_name: "Nome editado" })));
    await act(async () => { await result.current.refreshUser(); });
    expect(result.current.user?.full_name).toBe("Nome editado");
    expect(result.current.token).toBe("atual");
  });

  it("propaga o erro e encerra a sessão quando sua atualização recebe 401", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    act(() => result.current.login(makeSession("atual")));
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Expirado" }, 401));
    await act(async () => {
      await expect(result.current.refreshUser()).rejects.toBeInstanceOf(ApiError);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("preserva a conta quando a atualização falha por indisponibilidade", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    act(() => result.current.login(makeSession("atual")));
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await act(async () => {
      await expect(result.current.refreshUser()).rejects.toMatchObject({ status: 0 });
    });
    expect(result.current.user).toEqual(makeUser());
    expect(result.current.token).toBe("atual");
  });

  it.each([200, 401])("ignora atualização antiga com status %s após troca de sessão", async (status) => {
    const { result } = renderHook(useAuth, { wrapper });
    act(() => result.current.login(makeSession("antigo")));
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    let refresh!: Promise<void>;
    act(() => { refresh = result.current.refreshUser(); });

    const next = makeSession("novo", { id: 2 });
    act(() => result.current.login(next));
    await act(async () => {
      pending.resolve(jsonResponse(status === 200 ? makeUser() : { detail: "Expirado" }, status));
      await refresh;
    });
    expect(result.current.user).toEqual(next.user);
    expect(result.current.token).toBe("novo");
    expect(sessionStorage.getItem(storageKey)).toBe("novo");
  });

  it("expira somente a sessão à qual o erro pertence", () => {
    const { result } = renderHook(useAuth, { wrapper });
    act(() => result.current.login(makeSession("novo")));
    expect(result.current.expireSession(null)).toBe(false);
    expect(result.current.expireSession("antigo")).toBe(false);
    expect(result.current.token).toBe("novo");

    act(() => { expect(result.current.expireSession("novo")).toBe(true); });
    expect(result.current.token).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("não consulta a API ao atualizar uma sessão ausente", async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await act(async () => { await result.current.refreshUser(); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
