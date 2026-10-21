export function digits(value: string) {
  return value.replace(/\D/g, "");
}

/** Aceita o documento puro ou sua máscara padrão, preservando letras e zeros. */
export function normalizeDocument(value: string) {
  const trimmed = value.trim();
  if (/[^\x00-\x7F]/.test(trimmed)) return trimmed;
  const document = trimmed.toUpperCase();
  const standardCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(document);
  const standardCnpj = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/.test(document);
  return standardCpf || standardCnpj ? document.replace(/[.\-/]/g, "") : document;
}

export function validCpf(value: string): boolean {
  const number = normalizeDocument(value);
  if (!/^\d{11}$/.test(number) || /^(\d)\1+$/.test(number)) return false;
  for (const length of [9, 10]) {
    const total = number
      .slice(0, length)
      .split("")
      .reduce(
        (sum, digit, index) => sum + Number(digit) * (length + 1 - index),
        0,
      );
    const remainder = (total * 10) % 11;
    if ((remainder === 10 ? 0 : remainder) !== Number(number[length]))
      return false;
  }
  return true;
}

export function validCnpj(value: string): boolean {
  const number = normalizeDocument(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(number) || /^(\d)\1+$/.test(number))
    return false;
  for (const weights of [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]) {
    const total = weights.reduce(
      (sum, weight, index) => sum + (number.charCodeAt(index) - 48) * weight,
      0,
    );
    const remainder = total % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(number[weights.length]))
      return false;
  }
  return true;
}

export function safeNextPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return "/painel";
  try {
    const parsed = new URL(value, "https://socialtrade.local");
    if (
      parsed.origin !== "https://socialtrade.local" ||
      !/^\/painel(?:\/|$)/.test(parsed.pathname)
    )
      return "/painel";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/painel";
  }
}
