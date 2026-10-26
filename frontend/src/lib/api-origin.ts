type ApiEnvironment = {
  NODE_ENV?: string;
  SOCIALTRADE_API_URL?: string;
};

const LOCAL_API_ORIGIN = "http://127.0.0.1:8000";

export function getApiOrigin(
  env: ApiEnvironment = process.env,
): string {
  const configured = env.SOCIALTRADE_API_URL?.trim();
  if (!configured) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Configure SOCIALTRADE_API_URL com a origem acessível do backend FastAPI antes do build de produção.",
      );
    }
    return LOCAL_API_ORIGIN;
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("SOCIALTRADE_API_URL deve ser uma URL absoluta HTTP ou HTTPS.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("SOCIALTRADE_API_URL deve usar HTTP ou HTTPS.");
  }

  return configured.replace(/\/+$/, "");
}
