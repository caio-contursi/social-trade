"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { scrollToSection } from "@/lib/scroll-to-section";

export function openProjectsLink(cause?: string) {
  return cause ? `/?causa=${encodeURIComponent(cause)}#projetos` : "/#projetos";
}

export function OpenProjectsLink({
  cause,
  children,
  ...props
}: Omit<LinkProps, "href"> & AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; cause?: string }) {
  return (
    <Link
      {...props}
      href={openProjectsLink(cause)}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || props.target === "_blank") return;
        // Deixa o Next sincronizar query/hash com useSearchParams no filtro de projetos.
        if (cause) return;
        if (window.location.pathname !== "/") return;
        event.preventDefault();
        window.history.replaceState(window.history.state, "", "/");
        const alreadyExploring = document.documentElement.dataset.exploringProjects === "true";
        if (alreadyExploring) {
          const target = document.getElementById("projetos");
          if (target) scrollToSection(target);
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
        window.dispatchEvent(new CustomEvent("socialtrade:open-projects"));
      }}
    >
      {children}
    </Link>
  );
}
