"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, HeartHandshake, HeartPulse, Leaf, MapPin, PawPrint, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { areaLabels } from "@/lib/catalog";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const visuals = {
  food: { icon: Utensils, color: "bg-[#f4edda] text-[#836323] dark:bg-[#423b26] dark:text-[#ead497]" },
  education: { icon: GraduationCap, color: "bg-[#e8ede7] text-[#52694d] dark:bg-[#31432f] dark:text-[#c1d3b9]" },
  health: { icon: HeartPulse, color: "bg-[#f3e7e3] text-[#975e4c] dark:bg-[#49332e] dark:text-[#e4b8aa]" },
  environment: { icon: Leaf, color: "bg-[#e2eee7] text-[#39765b] dark:bg-[#284936] dark:text-[#a8d1b5]" },
  animals: { icon: PawPrint, color: "bg-[#eee8f1] text-[#7c638b] dark:bg-[#42354c] dark:text-[#d5bce5]" },
};

export function ProjectVisual({ project, className }: { project: Project; className?: string }) {
  const [broken, setBroken] = useState(false);
  const visual = visuals[project.areas[0] as keyof typeof visuals] || { icon: HeartHandshake, color: "bg-secondary text-primary" };
  const Icon = visual.icon;
  let logo: string | null = null;
  try { const url = new URL(project.logo_url || ""); if (["https:", "http:"].includes(url.protocol)) logo = url.href; } catch {}
  return <div className={cn("relative flex min-h-40 items-center justify-center overflow-hidden", visual.color, className)}>
    {logo && !broken ? <img src={logo} alt={`Logotipo de ${project.name}`} onError={() => setBroken(true)} loading="lazy" width={160} height={160} className="m-8 max-h-36 max-w-[65%] object-contain" /> : <><div aria-hidden="true" className="absolute -right-8 -top-12 size-44 rounded-full border border-current opacity-[.07]" /><div aria-hidden="true" className="absolute -bottom-16 -left-10 size-48 rounded-full border border-current opacity-[.07]" /><Icon aria-hidden="true" className="size-14 opacity-70" strokeWidth={1.15} /><span className="absolute bottom-4 left-5 text-[10px] font-semibold tracking-[.16em] uppercase">{areaLabels[project.areas[0]] || "Iniciativa social"}</span></>}
  </div>;
}

export function ProjectCard({ project }: { project: Project }) {
  return <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5">
    <div className="relative"><ProjectVisual project={project} />{project.is_demo && <Badge variant="secondary" className="absolute right-3 top-3 border border-border bg-background/95">Demonstração</Badge>}</div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{project.city}, {project.state}</p>
      <h3 className="mt-3 font-display text-xl font-semibold leading-tight"><Link href={`/projetos/${encodeURIComponent(project.slug)}`} className="rounded-sm underline-offset-4 group-hover:text-primary hover:underline">{project.name}</Link></h3>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{project.short_description}</p>
      <div className="mb-6 mt-4 flex flex-wrap gap-1.5">{project.areas.slice(0, 2).map(area => <Badge key={area} variant="outline" className="text-[11px] font-normal">{areaLabels[area] || area}</Badge>)}{project.areas.length > 2 && <Badge variant="outline" className="text-[11px] font-normal">+{project.areas.length - 2} causas</Badge>}</div>
      <Link href={`/projetos/${encodeURIComponent(project.slug)}`} aria-label={`Conhecer ${project.name}`} className="mt-auto inline-flex items-center justify-between gap-3 border-t pt-4 text-sm font-semibold text-primary">Conhecer o projeto <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></Link>
    </div>
  </article>;
}
