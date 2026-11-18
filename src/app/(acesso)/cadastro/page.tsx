import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta · Shelper" };

export default function PaginaCadastro() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-fundo px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
            <p className="text-sm text-suave">Guardamos só seu nome e e-mail. A senha fica com hash no Supabase Auth.</p>
          </div>
        </header>
        <div className="rounded-2xl border border-linha bg-cartao p-6 shadow-sm">
          <FormularioCadastro />
        </div>
        <p className="text-center text-sm text-suave">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-laranja underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
