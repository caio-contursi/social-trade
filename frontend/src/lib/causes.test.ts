import { HeartHandshake } from "lucide-react";
import { describe, expect, it } from "vitest";
import { areaLabels } from "@/lib/catalog";
import { causeCodes, causeVisual } from "@/lib/causes";

function luminance(hex: string) {
  const channels = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function colors(className: string, dark: boolean) {
  const prefix = dark ? "dark:" : "";
  const pick = (kind: "bg" | "text") =>
    className
      .split(" ")
      .find((token) => token.startsWith(`${prefix}${kind}-[#`))
      ?.match(/#[0-9a-f]{6}/i)?.[0];
  return { cover: pick("bg"), ink: pick("text") };
}

describe("causeVisual", () => {
  it("dá cor, ícone e nome próprios a todas as causas do catálogo", () => {
    expect(causeCodes.sort()).toEqual(Object.keys(areaLabels).sort());
    for (const code of Object.keys(areaLabels)) {
      const visual = causeVisual(code);
      expect(visual.label).toBe(areaLabels[code]);
      expect(visual.icon).not.toBe(HeartHandshake);
    }
  });

  it("usa uma capa diferente para cada causa", () => {
    const covers = causeCodes.map(
      (code) => colors(causeVisual(code).className, false).cover,
    );
    expect(new Set(covers).size).toBe(causeCodes.length);
  });

  it.each([false, true])(
    "mantém a tinta da capa com contraste AA (modo escuro: %s)",
    (dark) => {
      for (const code of causeCodes) {
        const { cover, ink } = colors(causeVisual(code).className, dark);
        expect(cover, code).toBeDefined();
        expect(ink, code).toBeDefined();
        expect(contrast(cover!, ink!), code).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each([undefined, null, "", "causa_inexistente", "toString", "__proto__"])(
    "cai na capa neutra para código desconhecido (%s)",
    (code) => {
      const visual = causeVisual(code);
      expect(visual.icon).toBe(HeartHandshake);
      expect(visual.label).toBe("Iniciativa social");
      expect(visual.className).toBe("bg-secondary text-secondary-foreground");
    },
  );
});
