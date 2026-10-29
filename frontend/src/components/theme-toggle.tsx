"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-label="Tema escuro"
      aria-checked={dark}
      disabled={!mounted}
      title={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative flex h-10 w-[4.5rem] shrink-0 items-center justify-between rounded-full border border-current/20 bg-primary/10 p-1 text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
    >
      <span aria-hidden="true" data-testid="theme-toggle-thumb" className={`absolute top-1 left-1 size-[1.875rem] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-in-out motion-reduce:transition-none ${dark ? "translate-x-8" : "translate-x-0"}`} />
      <Sun aria-hidden="true" className={`relative z-10 mx-auto size-4 transition-colors duration-200 ${dark ? "text-muted-foreground" : "text-primary-foreground"}`} />
      <Moon aria-hidden="true" className={`relative z-10 mx-auto size-4 transition-colors duration-200 ${dark ? "text-primary-foreground" : "text-muted-foreground"}`} />
    </button>
  );
}
