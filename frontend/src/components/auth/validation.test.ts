import { describe, expect, it } from "vitest";
import { digits, normalizeDocument, safeNextPath, validCnpj, validCpf } from "./validation";

describe("documentos do cadastro", () => {
  it("normaliza documentos formatados antes do envio", () => {
    expect(digits("CPF: 529.982.247-25")).toBe("52998224725");
    expect(digits("04.252.011/0001-10")).toBe("04252011000110");
    expect(normalizeDocument(" 12.abc.345/01de-35 ")).toBe("12ABC34501DE35");
    expect(normalizeDocument("00.000.000/0001-91")).toBe("00000000000191");
    expect(normalizeDocument("12ABC34501DÉ35")).toBe("12ABC34501DÉ35");
    expect(normalizeDocument("12 ABC34501DE35")).toBe("12 ABC34501DE35");
  });

  it.each(["52998224725", "529.982.247-25", "111.444.777-35", "012.345.678-90"])(
    "aceita CPF com dígitos verificadores válidos: %s", (document) => {
      expect(validCpf(document)).toBe(true);
    },
  );

  it.each(["", "5299822472", "529982247250", "52998224724", "52998224715", "00000000000", "11111111111", "99999999999", "CPF52998224725", "52998224725!", "5299822472A", "529 98224725", "529/982/247/25"])(
    "rejeita CPF incompleto, repetido ou com dígitos alterados: %s", (document) => {
      expect(validCpf(document)).toBe(false);
    },
  );

  it.each(["04252011000110", "04.252.011/0001-10", "11.222.333/0001-81", "12ABC34501DE35", "12.abc.345/01de-35"])(
    "aceita CNPJ com dígitos verificadores válidos: %s", (document) => {
      expect(validCnpj(document)).toBe(true);
    },
  );

  it.each(["", "0425201100011", "042520110001100", "04252011000111", "04252011000100", "00000000000000", "11111111111111", "12ABC34501DE34", "12ABC34501DE45", "12ABC34501DE3A", "12ABC34501DÉ35", "12ABC34501DE35!", "12_ABC34501DE35", "12 ABC34501DE35", "12/ABC/345/01DE/35", "04 252011000110"])(
    "rejeita CNPJ incompleto, repetido ou com dígitos alterados: %s", (document) => {
      expect(validCnpj(document)).toBe(false);
    },
  );
});

describe("destino após o login", () => {
  it.each(["/painel", "/painel/organizacoes", "/painel/perfil?aba=dados#telefone"])(
    "mantém o destino interno permitido: %s", (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    null, "", "https://example.test/painel", "//example.test/painel",
    "javascript:alert(1)", "/\\example.test/painel", "/painel\u0000/", "/painel\n/perfil",
    "/projetos", "/painel-falso", "/painel/../../externo", "/painel/%2e%2e/externo",
  ])("bloqueia um destino externo, malformado ou fora do painel: %s", (path) => {
    expect(safeNextPath(path)).toBe("/painel");
  });
});
