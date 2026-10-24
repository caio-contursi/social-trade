import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDonationReceipt, parseDonationAmount } from "./donations";

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
