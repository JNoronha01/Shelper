import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { listarProjetos } from "@/lib/board/dados";
import { NovoProjeto } from "./formulario-projeto";

export const metadata: Metadata = { title: "Meus projetos · Shelper" };

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" });

async function ListaDeProjetos() {
  const usuario = await exigirUsuario();
  const projetos = await listarProjetos(usuario.id);

  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">
        Olá, <span className="font-medium text-zinc-900 dark:text-zinc-100">{usuario.nome.split(" ")[0]}</span>.{" "}
        {projetos.length
          ? "Escolha um projeto para abrir o board."
          : "Crie o primeiro projeto: ele já vem com as 5 colunas do fluxo."}
      </p>

      {projetos.length === 0 && (
        <div>
          <NovoProjeto destaque />
        </div>
      )}

      {projetos.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projetos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/painel/projetos/${p.id}`}
                className="group flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-zinc-900 group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-indigo-300">
                    {p.nome}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {p.papel === "dono" ? "Dono" : "Membro"}
                  </span>
                </div>
                <div className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20" />
                  ))}
                </div>
                <span className="text-xs text-zinc-500">Criado em {DATA.format(new Date(p.criadoEm))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PaginaPainel() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Meus projetos</h1>
          <NovoProjeto />
        </div>
        <Suspense fallback={<p className="text-zinc-500">Carregando projetos…</p>}>
          <ListaDeProjetos />
        </Suspense>
      </div>
    </main>
  );
}
