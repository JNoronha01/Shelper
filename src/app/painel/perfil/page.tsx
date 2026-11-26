import type { Metadata } from "next";
import Link from "next/link";
import { TransicaoPagina } from "@/components/transicao-pagina";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { carregarMeuPerfil } from "@/lib/board/dados";
import { FotoENome, SairDeTodos, TrocarEmail, TrocarSenha } from "./formularios";

export const metadata: Metadata = { title: "Meu perfil · Shelper" };

async function Formularios() {
  const usuario = await exigirUsuario();
  const perfil = await carregarMeuPerfil(usuario.id);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <FotoENome nome={perfil?.nome ?? usuario.nome} foto={perfil?.foto ?? null} />
      <div className="flex flex-col gap-6">
        <TrocarEmail email={usuario.email} />
        <TrocarSenha />
        <SairDeTodos />
      </div>
    </div>
  );
}

export default function PaginaPerfil() {
  return (
    <TransicaoPagina>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/painel"
            transitionTypes={["voltar"]}
            title="Voltar para Meus projetos"
            className="-ml-1.5 rounded-lg px-1.5 py-0.5 text-lg text-suave transition-colors hover:bg-elevado hover:text-texto focus-visible:outline-2 focus-visible:outline-laranja"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">Voltar para Meus projetos</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meu perfil</h1>
        </div>
        <Suspense fallback={<p className="text-suave">Carregando perfil…</p>}>
          <Formularios />
        </Suspense>
      </main>
    </TransicaoPagina>
  );
}
