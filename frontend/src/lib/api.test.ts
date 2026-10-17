import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";
import { jsonResponse } from "@/test/helpers";

describe("cliente HTTP", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("envia JSON autenticado preservando cabeçalhos da requisição", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 42 }));
    await expect(api("/api/organizations", {
      method: "POST", token: "token-da-sessao",
      headers: { "X-Request-Id": "test-request" },
      body: JSON.stringify({ name: "Organização" }),
    })).resolves.toEqual({ id: 42 });

    const [path, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options?.headers);
    expect(path).toBe("/api/organizations");
    expect(options).toMatchObject({ method: "POST", cache: "no-store" });
    expect(JSON.parse(options?.body as string)).toEqual({ name: "Organização" });
    expect(headers.get("Authorization")).toBe("Bearer token-da-sessao");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Request-Id")).toBe("test-request");
    expect(options).not.toHaveProperty("token");
  });

  it("não envia credenciais nem Content-Type em uma consulta pública", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await api("/api/public/projects");
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("preserva status e detalhe de uma sessão expirada para o chamador", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Sessão expirada." }, 401));
    await expect(api("/api/auth/me", { token: "antigo" })).rejects.toMatchObject({
      name: "ApiError", status: 401, message: "Sessão expirada.",
    });
  });

  it("traduz falhas de conectividade sem expor a mensagem interna do fetch", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("private transport detail"));
    await expect(api("/api/auth/me")).rejects.toEqual(
      new ApiError(0, "Não foi possível conectar à plataforma. Tente novamente em instantes."),
    );
  });

  it("reúne erros de validação do FastAPI sem o prefixo técnico", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      detail: [
        { loc: ["body", "document"], msg: "Value error, CPF inválido." },
        { loc: ["body", "email"], msg: "E-mail inválido." },
        { loc: ["body", "name"] },
      ],
    }, 422));
    await expect(api("/api/auth/register", { method: "POST", body: "{}" })).rejects.toMatchObject({
      status: 422, message: "CPF inválido. E-mail inválido. Revise os dados informados.",
    });
  });

  it.each([
    ["uma resposta HTML do proxy", () => new Response("<html>Bad gateway</html>", { status: 502 })],
    ["um JSON sem detalhe", () => jsonResponse({ error: "internal" }, 500)],
  ] as const)("usa mensagem segura para %s", async (_name, response) => {
    fetchMock.mockResolvedValueOnce(response());
    await expect(api("/api/public/projects")).rejects.toMatchObject({
      message: "Não foi possível concluir a solicitação. Tente novamente.",
    });
  });

  it("aceita uma operação bem-sucedida sem corpo de resposta", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api("/api/example", { method: "DELETE" })).resolves.toBeNull();
  });
});
