"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange><AuthProvider>{children}<Toaster richColors position="top-right" offset={88} closeButton toastOptions={{ closeButtonAriaLabel: "Fechar aviso" }} /></AuthProvider></ThemeProvider>;
}
