import type { Metadata } from "next";
import Link from "next/link";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta · Shelper" };

export default function PaginaCadastro() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Shelper
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
      </header>
      <FormularioCadastro />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
          Entrar
        </Link>
      </p>
    </main>
  );
}
