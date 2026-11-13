import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioEntrada } from "./formulario-entrada";

export const metadata: Metadata = { title: "Entrar · Shelper" };

export default function PaginaEntrada() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Shelper
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      </header>
      {/* useSearchParams lê a URL da requisição, por isso fica atrás de um Suspense. */}
      <Suspense>
        <FormularioEntrada />
      </Suspense>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
