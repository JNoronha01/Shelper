import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { FormularioEsqueci } from "./formulario";

export const metadata: Metadata = { title: "Esqueci minha senha · Shelper" };

export default function PaginaEsqueci() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-fundo px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Esqueci minha senha</h1>
            <p className="text-sm text-suave">Informe o e-mail da conta. Mandamos um link para você criar uma senha nova.</p>
          </div>
        </header>
        <div className="rounded-2xl border border-linha bg-cartao p-6 shadow-sm">
          <Suspense>
            <FormularioEsqueci />
          </Suspense>
        </div>
        <p className="text-center text-sm text-suave">
          Lembrou?{" "}
          <Link href="/entrar" className="font-medium text-laranja underline underline-offset-4">
            Voltar para Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
