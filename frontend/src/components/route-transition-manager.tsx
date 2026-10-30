"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PendingRoute = { pathname: string; search: string; startedAt: number };

export const ROUTE_TRANSITION_MIN_MS = 1000;

export function RouteTransitionManager() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const pending = useRef<PendingRoute | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const begin = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor?.hasAttribute("data-route-transition")) return;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      const startedAt = Date.now();
      pending.current = { pathname: destination.pathname, search: destination.search, startedAt };
      setVisible(true);
      setClosing(false);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        pending.current = null;
        setVisible(false);
      }, 10000);
    };

    document.addEventListener("click", begin, true);
    return () => document.removeEventListener("click", begin, true);
  }, []);

  useEffect(() => {
    const target = pending.current;
    if (!target || target.pathname !== pathname || target.search !== window.location.search) return;
    pending.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    const remainingLoadingTime = Math.max(0, ROUTE_TRANSITION_MIN_MS - (Date.now() - target.startedAt));
    timeout.current = setTimeout(() => {
      setClosing(true);
      timeout.current = setTimeout(() => setVisible(false), 300);
    }, remainingLoadingTime);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [pathname]);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  if (!visible) return null;
  return (
    <div className={`route-transition-overlay${closing ? " is-closing" : ""}`} role="status" aria-label="Carregando próxima página">
      <span className="route-transition-spinner" aria-hidden="true" />
    </div>
  );
}
