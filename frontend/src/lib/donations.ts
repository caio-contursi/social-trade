export function parseDonationAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
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
