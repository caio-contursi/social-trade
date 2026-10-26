"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Crossfades public page content during project discovery navigation. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      enter={{
        "discovery-forward": "discovery-enter",
        "discovery-back": "discovery-return-enter",
        default: "none",
      }}
      exit={{
        "discovery-forward": "discovery-exit",
        "discovery-back": "discovery-return-exit",
        default: "none",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
