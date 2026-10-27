"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToSection } from "@/lib/scroll-to-section";

/** Restaura o topo ou resolve uma âncora após cada navegação entre páginas. */
export function RouteScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let target: HTMLElement | null = null;
      if (window.location.hash) {
        try {
          target = document.getElementById(
            decodeURIComponent(window.location.hash.slice(1)),
          );
        } catch {
          target = null;
        }
      }

      if (target) {
        scrollToSection(target);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
