import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { FormularioEntrada } from "./formulario-entrada";

export const metadata: Metadata = { title: "Entrar · Shelper" };

export default function PaginaEntrada() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
            <p className="text-sm text-zinc-500">Abra os projetos do seu time.</p>
          </div>
        </header>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* useSearchParams lê a URL da requisição, por isso fica atrás de um Suspense. */}
          <Suspense>
            <FormularioEntrada />
          </Suspense>
        </div>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
