export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError"; }
}

type RequestOptions = RequestInit & { token?: string | null };

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(path, { ...init, headers, cache: "no-store" }); }
  catch { throw new ApiError(0, "Não foi possível conectar à plataforma. Tente novamente em instantes."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: {msg?: string}) => (item.msg || "Revise os dados informados.").replace(/^Value error, /, "")).join(" ")
      : typeof detail === "string" ? detail : "Não foi possível concluir a solicitação. Tente novamente.";
    throw new ApiError(response.status, message);
  }
  return data as T;
}
