import Link from "next/link";
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "./botoes";
import { Logo } from "./logo";

// Cabeçalho das páginas públicas. Os atalhos do meio somem no celular (o rodapé tem todos).
const ATALHOS = [
  ["Como funciona", "/#como-funciona"],
  ["Dashboard", "/#dashboard"],
  ["Perguntas", "/#perguntas"],
  ["Guia", "/guia"],
  ["Contato", "/contato"],
] as const;

export function TopoPublico() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5">
      <Logo />
      <nav aria-label="Seções" className="hidden items-center gap-1 text-sm md:flex">
        {ATALHOS.map(([rotulo, href]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-suave transition-colors hover:bg-elevado hover:text-texto">
            {rotulo}
          </Link>
        ))}
      </nav>
      <nav aria-label="Conta" className="flex items-center gap-2">
        <Link href="/entrar" className={`${BOTAO_SECUNDARIO} !px-3 !py-2`}>
          Entrar
        </Link>
        <Link href="/cadastro" className={`${BOTAO_PRINCIPAL} !px-3 !py-2`}>
          Criar conta
        </Link>
      </nav>
    </header>
  );
}
