export function parseDonationAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Converte SOL em lamports sem arredondar além das nove casas da moeda. */
export function parseSolAmount(value: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,9}))?$/.exec(value.trim());
  if (!match) return null;
  const lamports = Number(match[1]) * 1_000_000_000
    + Number((match[2] || "").padEnd(9, "0") || "0");
  if (!Number.isSafeInteger(lamports) || lamports < 100_000 || lamports > 100_000_000_000) return null;
  return lamports;
}

/** Indicative conversion; SOL output is rounded once to whole lamports. */
export function convertDonationCurrency(value: string, from: "BRL" | "SOL", rate: number): string {
  const pattern = from === "BRL" ? /^\d{1,9}(?:[.,]\d{0,2})?$/ : /^\d{1,3}(?:[.,]\d{0,9})?$/;
  if (!pattern.test(value) || !Number.isFinite(rate) || rate <= 0) return "";
  const number = Number(value.replace(",", "."));
  const converted = from === "BRL" ? number / rate : number * rate;
  if (!Number.isFinite(converted) || converted < 0) return "";
  const formatted = converted.toFixed(from === "BRL" ? 9 : 2);
  return (from === "BRL" ? formatted.replace(/\.?0+$/, "") || "0" : formatted).replace(".", ",");
}

/** Mantém somente dígitos e um separador decimal, com até duas casas. */
export function normalizeDonationAmount(value: string): string {
  const normalized = value.replace(/[^\d,.]/g, "");
  const separator = normalized.match(/[,.]/)?.[0];
  if (!separator) return normalized.slice(0, 9);
  const [integer = "", ...fractionParts] = normalized.split(/[,.]/);
  const fraction = fractionParts.join("").slice(0, 2);
  return `${integer.slice(0, 9)}${separator}${fraction}`;
}

export async function fetchDonationReceipt(
  donationId: number,
  token: string,
): Promise<Blob> {
  const response = await fetch(`/api/donations/${donationId}/receipt`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload?.detail === "string"
        ? payload.detail
        : "Não foi possível abrir o comprovante.";
    throw new Error(message);
  }
  return response.blob();
}
