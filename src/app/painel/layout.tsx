import Link from "next/link";
import { Suspense } from "react";
import { sair } from "@/app/(acesso)/acoes";
import { BOTAO_SECUNDARIO } from "@/components/botoes";
import { exigirUsuario } from "@/lib/auth/usuario";

async function ContaDoUsuario() {
  const usuario = await exigirUsuario();
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span className="truncate text-zinc-600 dark:text-zinc-400" title={usuario.email}>
        {usuario.nome}
      </span>
      <form action={sair}>
        <button type="submit" className={BOTAO_SECUNDARIO}>
          Sair
        </button>
      </form>
    </div>
  );
}

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/painel" className="font-bold tracking-tight">
            Shelper
          </Link>
          <Suspense>
            <ContaDoUsuario />
          </Suspense>
        </div>
      </header>
      {children}
    </div>
  );
}
