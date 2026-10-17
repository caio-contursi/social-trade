export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function validCpf(value: string): boolean {
  const number = digits(value);
  if (number.length !== 11 || /^(\d)\1+$/.test(number)) return false;
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
  const number = digits(value);
  if (number.length !== 14 || /^(\d)\1+$/.test(number)) return false;
  for (const weights of [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]) {
    const total = weights.reduce(
      (sum, weight, index) => sum + Number(number[index]) * weight,
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
