"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export function OpenProjectsLink({
  cause,
  children,
  ...props
}: Omit<LinkProps, "href"> & AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; cause?: string }) {
  return (
    <Link
      {...props}
      href={cause ? `/?causa=${encodeURIComponent(cause)}#projetos` : "/#projetos"}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.history.replaceState(
          window.history.state,
          "",
          cause ? `/?causa=${encodeURIComponent(cause)}#projetos` : "/",
        );
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        window.dispatchEvent(new CustomEvent("socialtrade:open-projects"));
      }}
    >
      {children}
    </Link>
  );
}
