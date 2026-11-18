import { Suspense } from "react";
import { sair } from "@/app/(acesso)/acoes";
import { Avisos } from "@/components/avisos";
import { BOTAO_TEXTO } from "@/components/botoes";
import { Logo } from "@/components/logo";
import { exigirUsuario } from "@/lib/auth/usuario";

async function ContaDoUsuario() {
  const usuario = await exigirUsuario();
  const inicial = usuario.nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full border border-linha-forte bg-elevado text-sm font-semibold text-texto"
      >
        {inicial}
      </span>
      <span className="hidden truncate text-texto sm:inline" title={usuario.email}>
        {usuario.nome}
      </span>
      <form action={sair}>
        <button type="submit" className={`${BOTAO_TEXTO} !text-sm`}>
          Sair
        </button>
      </form>
    </div>
  );
}

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <Avisos>
    <div className="flex flex-1 flex-col bg-fundo">
      <header className="sticky top-0 z-20 border-b border-linha bg-fundo/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <Logo href="/painel" />
          <Suspense>
            <ContaDoUsuario />
          </Suspense>
        </div>
      </header>
      {children}
    </div>
    </Avisos>
  );
}
