import { describe, expect, it } from "vitest";
import { getApiOrigin } from "@/lib/api-origin";

describe("getApiOrigin", () => {
  it("uses localhost only during development when no URL is configured", () => {
    expect(getApiOrigin({ NODE_ENV: "development" })).toBe(
      "http://127.0.0.1:8000",
    );
  });

  it("normalizes a configured API URL without losing a path prefix", () => {
    expect(
      getApiOrigin({
        NODE_ENV: "production",
        SOCIALTRADE_API_URL: "https://api.example.org/backend///",
      }),
    ).toBe("https://api.example.org/backend");
  });

  it("refuses to build production with an implicit localhost backend", () => {
    expect(() => getApiOrigin({ NODE_ENV: "production" })).toThrow(
      /Configure SOCIALTRADE_API_URL/,
    );
  });

  it("rejects relative or non-HTTP API URLs", () => {
    expect(() =>
      getApiOrigin({ NODE_ENV: "development", SOCIALTRADE_API_URL: "/api" }),
    ).toThrow(/URL absoluta/);
    expect(() =>
      getApiOrigin({ NODE_ENV: "development", SOCIALTRADE_API_URL: "ftp://api.example.org" }),
    ).toThrow(/HTTP ou HTTPS/);
  });
});
