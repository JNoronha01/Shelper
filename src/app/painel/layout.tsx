import { Suspense } from "react";
import { sair } from "@/app/(acesso)/acoes";
import { BOTAO_SECUNDARIO } from "@/components/botoes";
import { Logo } from "@/components/logo";
import { exigirUsuario } from "@/lib/auth/usuario";

async function ContaDoUsuario() {
  const usuario = await exigirUsuario();
  const inicial = usuario.nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
      >
        {inicial}
      </span>
      <span className="hidden truncate text-zinc-600 sm:inline dark:text-zinc-400" title={usuario.email}>
        {usuario.nome}
      </span>
      <form action={sair}>
        <button type="submit" className={`${BOTAO_SECUNDARIO} !px-3 !py-1.5`}>
          Sair
        </button>
      </form>
    </div>
  );
}

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Logo href="/painel" />
          <Suspense>
            <ContaDoUsuario />
          </Suspense>
        </div>
      </header>
      {children}
    </div>
  );
}
