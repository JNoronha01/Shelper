import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { carregarMeuPerfil } from "@/lib/board/dados";
import { FotoENome, TrocarEmail, TrocarSenha } from "./formularios";

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
      </div>
    </div>
  );
}

export default function PaginaPerfil() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-1">
        <Link href="/painel" className="w-fit text-sm text-suave transition-colors hover:text-texto">
          Voltar para Meus projetos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meu perfil</h1>
      </div>
      <Suspense fallback={<p className="text-suave">Carregando perfil…</p>}>
        <Formularios />
      </Suspense>
    </main>
  );
}
