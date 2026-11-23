"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BOTAO_TEXTO } from "@/components/botoes";
import { Seletor } from "@/components/seletor";
import type { Cartao, Membro, Sprint } from "@/lib/board/dados";

export type FiltrosNaTela = { sprint?: string; pessoa?: string; cartao?: string; wip?: string };

// Cada filtro muda o endereço da página; o servidor busca de novo, já filtrado.
export function FiltrosDoHistorico({
  projetoId,
  filtros,
  sprints,
  time,
  cartoes,
}: {
  projetoId: string;
  filtros: FiltrosNaTela;
  sprints: Sprint[];
  time: Membro[];
  cartoes: Cartao[];
}) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const ir = (mudanca: Partial<FiltrosNaTela>) => {
    const novos = { ...filtros, ...mudanca };
    const q = new URLSearchParams({ aba: "historico" });
    for (const [k, v] of Object.entries(novos)) if (v) q.set(k, v);
    iniciar(() => router.push(`/painel/projetos/${projetoId}?${q.toString()}`, { scroll: false }));
  };
  const algum = Boolean(filtros.sprint || filtros.pessoa || filtros.cartao || filtros.wip);

  return (
    <div className={`flex flex-wrap items-end gap-3 transition-opacity ${carregando ? "opacity-60" : ""}`} aria-busy={carregando}>
      <Filtro rotulo="Sprint">
        <Seletor
          rotuloAcessivel="Filtrar por Sprint"
          valor={filtros.sprint ?? ""}
          onChange={(v) => ir({ sprint: v })}
          opcoes={[{ valor: "", rotulo: "Todas" }, ...sprints.map((s) => ({ valor: s.id, rotulo: `Sprint ${s.numero}` }))]}
          className="w-36"
        />
      </Filtro>
      <Filtro rotulo="Pessoa">
        <Seletor
          rotuloAcessivel="Filtrar por pessoa"
          valor={filtros.pessoa ?? ""}
          onChange={(v) => ir({ pessoa: v })}
          opcoes={[{ valor: "", rotulo: "Todas" }, ...time.map((m) => ({ valor: m.usuarioId, rotulo: m.nome }))]}
          className="w-44"
        />
      </Filtro>
      <Filtro rotulo="Cartão">
        <Seletor
          rotuloAcessivel="Filtrar por cartão"
          valor={filtros.cartao ?? ""}
          onChange={(v) => ir({ cartao: v })}
          opcoes={[{ valor: "", rotulo: "Todos" }, ...cartoes.map((c) => ({ valor: c.id, rotulo: c.titulo }))]}
          className="w-56"
        />
      </Filtro>
      <Filtro rotulo="WIP">
        <Seletor
          rotuloAcessivel="Filtrar movimentos acima do WIP"
          valor={filtros.wip ?? ""}
          onChange={(v) => ir({ wip: v })}
          opcoes={[
            { valor: "", rotulo: "Tudo" },
            { valor: "acima", rotulo: "Só acima do WIP" },
          ]}
          className="w-40"
        />
      </Filtro>
      {algum && (
        <button type="button" onClick={() => ir({ sprint: "", pessoa: "", cartao: "", wip: "" })} className={BOTAO_TEXTO}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function Filtro({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-suave">{rotulo}</span>
      {children}
    </div>
  );
}
