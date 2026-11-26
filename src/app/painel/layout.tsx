import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { carregarMeuPerfil } from "@/lib/board/dados";
import { sair } from "@/app/(acesso)/acoes";
import { Avisos } from "@/components/avisos";
import { BOTAO_TEXTO } from "@/components/botoes";
import { Logo } from "@/components/logo";
import { exigirUsuario } from "@/lib/auth/usuario";

async function ContaDoUsuario() {
  const usuario = await exigirUsuario();
  const perfil = await carregarMeuPerfil(usuario.id);
  const nome = perfil?.nome ?? usuario.nome;
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Link
        href="/painel/perfil"
        transitionTypes={["ir"]}
        className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-1 transition-colors hover:bg-elevado focus-visible:outline-2 focus-visible:outline-laranja"
        title="Meu perfil"
      >
        <Avatar nome={nome} foto={perfil?.foto} />
        <span className="hidden truncate text-texto sm:inline">{nome}</span>
      </Link>
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
      <div className="flex min-h-dvh flex-1 flex-col bg-fundo">
        {/* Altura fixa (3.5rem): o board usa a altura da tela menos o topo. */}
        {/* viewTransitionName "topo": o cabeçalho fica parado enquanto as páginas deslizam. */}
        <header
          style={{ viewTransitionName: "topo" }}
          className="sticky top-0 z-20 h-14 shrink-0 print:hidden border-b border-linha bg-fundo/85 backdrop-blur-md"
        >
          <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4">
            <Logo href="/painel" tipos={["voltar"]} />
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
