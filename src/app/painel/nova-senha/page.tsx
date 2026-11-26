import type { Metadata } from "next";
import { FormularioNovaSenha } from "./formulario";

export const metadata: Metadata = { title: "Nova senha · Shelper" };

// Aberta pelo link de "Esqueci minha senha" (o link já entra na conta). Fica dentro do painel
// para exigir a sessão; a ação confere que ela veio do link há pouco tempo.
export default function PaginaNovaSenha() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Criar nova senha</h1>
          <p className="text-sm text-suave">Depois de salvar, os outros aparelhos com a sua conta aberta são desconectados.</p>
        </div>
        <div className="rounded-2xl border border-linha bg-cartao p-6 shadow-sm">
          <FormularioNovaSenha />
        </div>
      </div>
    </main>
  );
}
