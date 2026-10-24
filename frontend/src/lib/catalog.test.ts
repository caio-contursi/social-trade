import { describe, expect, it } from "vitest";
import { compareRecentProjects, formatDate, parseApiDate, serviceStatusLabel } from "@/lib/catalog";

describe("serviceStatusLabel", () => {
  it.each([
    ["available", "Disponível"],
    ["coming_soon", "Em breve"],
    ["future", "Planejado, sem previsão"],
  ])("traduz o estado %s da API", (status, label) => {
    expect(serviceStatusLabel(status)).toBe(label);
  });

  it.each(["", "beta", "toString", "__proto__"])(
    "não apresenta estado desconhecido (%s) como disponível",
    (status) => {
      expect(serviceStatusLabel(status)).toBe("Situação não informada");
    },
  );
});

describe("datas da API PostgreSQL e do legado", () => {
  it.each(["2026-10-21T12:00:00Z", "2026-10-21T09:00:00-03:00", "2026-10-21T12:00:00+00:00", "2026-10-21 12:00:00", "2026-10-21T12:00:00"])(
    "interpreta como o mesmo instante UTC: %s", (value) => {
      expect(parseApiDate(value).toISOString()).toBe("2026-10-21T12:00:00.000Z");
    },
  );

  it("exibe o dia conforme o fuso solicitado e trata datas inválidas", () => {
    const options = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" } as const;
    expect(formatDate("2026-10-21T01:00:00Z", options)).toBe("20/10/2026");
    expect(formatDate("2026-10-20T22:00:00-03:00", options)).toBe("20/10/2026");
    expect(formatDate("inválida")).toBe("Data não informada");
    expect(formatDate("2026-10-21T12:00:00Z")).not.toBe("Data não informada");
  });

  it("ordena instantes com offsets diferentes e usa o ID no empate", () => {
    const items = [
      { id: 2, created_at: "2026-10-21T09:00:00-03:00" },
      { id: 4, created_at: "2026-10-21 12:00:00" },
      { id: 1, created_at: "2026-10-21T11:30:00Z" },
      { id: 3, created_at: "2026-10-21T13:00:00+00:00" },
    ];
    expect(items.sort(compareRecentProjects).map((item) => item.id)).toEqual([3, 4, 2, 1]);
    expect(compareRecentProjects({ created_at: "2026-10-21T12:00:00Z" }, { created_at: "2026-10-21T12:00:00Z" })).toBe(0);
  });
});
