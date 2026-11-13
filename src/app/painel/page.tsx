import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";

export const metadata: Metadata = { title: "Painel · Shelper" };

async function ResumoDaConta() {
  const usuario = await exigirUsuario();
  return (
    <p className="text-zinc-600 dark:text-zinc-400">
      Conectado como <span className="font-medium text-zinc-900 dark:text-zinc-100">{usuario.email}</span>.
    </p>
  );
}

export default function PaginaPainel() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
      <Suspense fallback={<p className="text-zinc-500">Carregando conta…</p>}>
        <ResumoDaConta />
      </Suspense>
      <p className="rounded-lg border border-zinc-200 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Nenhum projeto ainda. Os projetos do seu time ficarão nesta área, visíveis só para quem tem acesso.
      </p>
    </main>
  );
}
