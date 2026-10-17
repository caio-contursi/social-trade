import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <AuthShell registration>
      <Suspense
        fallback={
          <p className="text-muted-foreground">Preparando seu cadastro...</p>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
