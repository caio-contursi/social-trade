import { describe, expect, it } from "vitest";
import { serviceStatusLabel } from "@/lib/catalog";

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
