import {
  Baby,
  Cpu,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  House,
  Leaf,
  LifeBuoy,
  Palette,
  PawPrint,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { areaLabels } from "@/lib/catalog";

export type CauseVisual = {
  code: string;
  label: string;
  icon: LucideIcon;
  /** Capa da causa: fundo claro com tinta escura e a variante do modo escuro. */
  className: string;
};

// Cores registradas em docs/design.md. Toda dupla capa/tinta passa de 4,5:1,
// no claro e no escuro (conferido em causes.test.ts).
const visuals: Record<string, { icon: LucideIcon; className: string }> = {
  food: {
    icon: Utensils,
    className:
      "bg-[#fbe1cc] text-[#8f3a10] dark:bg-[#3d2416] dark:text-[#f6c8a3]",
  },
  education: {
    icon: GraduationCap,
    className:
      "bg-[#dbe5fb] text-[#22409a] dark:bg-[#1c2747] dark:text-[#b9cdfa]",
  },
  health: {
    icon: HeartPulse,
    className:
      "bg-[#f9dbe5] text-[#9c2149] dark:bg-[#3d1a27] dark:text-[#f5b6cb]",
  },
  housing: {
    icon: House,
    className:
      "bg-[#f1e2d1] text-[#71441b] dark:bg-[#33261a] dark:text-[#e9cda9]",
  },
  children: {
    icon: Baby,
    className:
      "bg-[#fdeeb8] text-[#7a5600] dark:bg-[#362b0b] dark:text-[#f6dc8a]",
  },
  homelessness: {
    icon: HandHeart,
    className:
      "bg-[#e6e0f6] text-[#4a3692] dark:bg-[#261f44] dark:text-[#cdc2f5]",
  },
  animals: {
    icon: PawPrint,
    className:
      "bg-[#d5efe9] text-[#125f55] dark:bg-[#133430] dark:text-[#9fe0d2]",
  },
  environment: {
    icon: Leaf,
    className:
      "bg-[#dcefd9] text-[#28652b] dark:bg-[#17321a] dark:text-[#b2e0b0]",
  },
  sports: {
    icon: Trophy,
    className:
      "bg-[#d6eff9] text-[#0b5b7a] dark:bg-[#0f2d3a] dark:text-[#a6dcf1]",
  },
  culture: {
    icon: Palette,
    className:
      "bg-[#f4dcf0] text-[#842a77] dark:bg-[#36172f] dark:text-[#efb6e3]",
  },
  technology: {
    icon: Cpu,
    className:
      "bg-[#e1e7ee] text-[#30445a] dark:bg-[#1e2834] dark:text-[#c3d0de]",
  },
  emergency_relief: {
    icon: LifeBuoy,
    className:
      "bg-[#fbd9d3] text-[#9b2718] dark:bg-[#3e1a15] dark:text-[#f5b4a8]",
  },
};

const neutral = {
  icon: HeartHandshake,
  className: "bg-secondary text-secondary-foreground",
};

/** Cor, ícone e nome da causa; código desconhecido cai numa capa neutra. */
export function causeVisual(code?: string | null): CauseVisual {
  const key = code ?? "";
  const visual = Object.hasOwn(visuals, key) ? visuals[key] : neutral;
  return {
    code: key,
    label: Object.hasOwn(areaLabels, key)
      ? areaLabels[key]
      : "Iniciativa social",
    ...visual,
  };
}

export const causeCodes = Object.keys(visuals);
