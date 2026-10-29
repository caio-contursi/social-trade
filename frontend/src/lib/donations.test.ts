import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchDonationReceipt,
  normalizeDonationAmount,
  parseDonationAmount,
  parseSolAmount,
  convertDonationCurrency,
} from "./donations";

describe("conversão indicativa SOL/BRL", () => {
  it.each([
    ["25,00", "BRL", 500, "0,05"], ["0,05", "SOL", 500, "25,00"],
    ["100", "BRL", 10, "10"], ["1", "BRL", 3, "0,333333333"],
    ["", "BRL", 500, ""], ["abc", "SOL", 500, ""],
    ["-1", "BRL", 500, ""], ["1", "SOL", 0, ""],
    ["1", "BRL", Infinity, ""], ["1,123", "BRL", 500, ""],
  ] as const)("converte %s %s usando a cotação %s", (value, from, rate, expected) => {
    expect(convertDonationCurrency(value, from, rate)).toBe(expected);
  });
});

describe("normalizeDonationAmount", () => {
  it.each([
    ["R$ 25,00", "25,00"],
    ["12a,345", "12,34"],
    ["12345678999.99", "123456789.99"],
    ["25", "25"],
  ])("normalizes %s for a numeric currency field", (value, expected) => {
    expect(normalizeDonationAmount(value)).toBe(expected);
  });
});

describe("parseDonationAmount", () => {
  it.each([
    ["12", 1200],
    ["12,3", 1230],
    ["12.34", 1234],
    ["0,01", 1],
  ])("converts %s into integer BRL cents", (value, expected) => {
    expect(parseDonationAmount(value)).toBe(expected);
  });

  it.each(["", "0", "0,00", "1.234,56", "1,234", "-1", "abc", "1000000000"]) (
    "rejects invalid or unsupported amount %s",
    (value) => expect(parseDonationAmount(value)).toBeNull(),
  );
});

describe("parseSolAmount", () => {
  it.each([
    ["0,0001", 100_000],
    ["1.25", 1_250_000_000],
    ["100", 100_000_000_000],
  ])("converts %s SOL to exact lamports", (value, expected) => {
    expect(parseSolAmount(value)).toBe(expected);
  });

  it.each(["", "0", "0.00001", "100.000000001", "1.1234567890", "-1", "1,2.3", "101"]) (
    "rejects invalid SOL amount %s",
    (value) => expect(parseSolAmount(value)).toBeNull(),
  );
});

describe("fetchDonationReceipt", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("authenticates and returns the printable receipt document", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("<h1>Recibo</h1>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }));
    vi.stubGlobal("fetch", fetch);

    const result = await fetchDonationReceipt(42, "session-token");

    expect(result.type).toContain("text/html");
    expect(fetch).toHaveBeenCalledWith("/api/donations/42/receipt", {
      headers: { Authorization: "Bearer session-token" },
      cache: "no-store",
    });
  });

  it("surfaces the API error instead of downloading an unavailable receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Comprovante ainda não emitido." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchDonationReceipt(42, "session-token")).rejects.toThrow(
      "Comprovante ainda não emitido.",
    );
  });
});
