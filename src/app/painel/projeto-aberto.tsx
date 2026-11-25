"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps } from "react";
import { NomeDoProjeto } from "@/components/transicao-pagina";

// Lembra o nome do projeto clicado em Meus projetos. Enquanto a página do projeto carrega,
// o esqueleto já mostra esse nome no lugar do título, e o navegador anima o nome do cartão
// até ele (sem isso não há par para a animação, porque o título de verdade chega depois).
let aberto: { id: string; nome: string } | null = null;

export function LinkDoProjeto({ id, nome, ...props }: { id: string; nome: string } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      {...props}
      href={`/painel/projetos/${id}`}
      transitionTypes={["ir"]}
      onClick={(e) => {
        aberto = { id, nome };
        props.onClick?.(e);
      }}
    />
  );
}

const nada = () => () => {};

export function TituloCarregando() {
  // No servidor (e na primeira carga da página) não há projeto clicado: só o bloco cinza.
  const projeto = useSyncExternalStore(
    nada,
    () => aberto,
    () => null,
  );
  if (!projeto) return <div className="esqueleto h-8 w-64 rounded-lg" />;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="-ml-1.5 px-1.5 py-0.5 text-lg text-suave">
        ←
      </span>
      <NomeDoProjeto id={projeto.id}>
        <h1 className="truncate text-2xl font-semibold tracking-tight">{projeto.nome}</h1>
      </NomeDoProjeto>
    </div>
  );
}
