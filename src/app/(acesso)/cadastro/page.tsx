import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta · Shelper" };

export default function PaginaCadastro() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
            <p className="text-sm text-zinc-500">Guardamos só seu nome e e-mail. A senha fica com hash no Supabase Auth.</p>
          </div>
        </header>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <FormularioCadastro />
        </div>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
