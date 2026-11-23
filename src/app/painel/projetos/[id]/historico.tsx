import Link from "next/link";
import type { Cartao, ItemHistorico, Membro, Sprint } from "@/lib/board/dados";
import { ITENS_POR_PAGINA } from "@/lib/board/dados";
import { formatarDataHora } from "@/lib/board/regras";
import { FiltrosDoHistorico, type FiltrosNaTela } from "./historico-filtros";

// Histórico (PO e SM): criações e movimentos (base das métricas) e também responsável e
// bloqueios, com quem fez. Filtros e páginas ficam no endereço (?aba=historico&sprint=...),
// então dá para mandar o link já filtrado para o time.
export function Historico({
  projetoId,
  itens,
  total,
  pagina,
  filtros,
  sprints,
  time,
  cartoes,
  meuId,
}: {
  projetoId: string;
  itens: ItemHistorico[];
  total: number;
  pagina: number;
  filtros: FiltrosNaTela;
  sprints: Sprint[];
  time: Membro[];
  cartoes: Cartao[];
  meuId: string;
}) {
  const paginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const nome = (id: string | null) => {
    if (!id) return "alguém que saiu do projeto";
    if (id === meuId) return "você";
    return time.find((m) => m.usuarioId === id)?.nome ?? "alguém que saiu do projeto";
  };
  const link = (p: number) => {
    const q = new URLSearchParams({ aba: "historico" });
    for (const [k, v] of Object.entries(filtros)) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    return `/painel/projetos/${projetoId}?${q.toString()}`;
  };

  return (
    <section aria-labelledby="titulo-historico" className="flex flex-col gap-4">
      <div>
        <h2 id="titulo-historico" className="font-semibold">
          Histórico
        </h2>
        <p className="text-sm text-suave">
          Criações e movimentos entre colunas (a base das métricas, que não podem ser editados nem apagados), e também as trocas de
          responsável e os bloqueios.
        </p>
      </div>

      <FiltrosDoHistorico projetoId={projetoId} filtros={filtros} sprints={sprints} time={time} cartoes={cartoes} />

      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-linha-forte px-4 py-6 text-center text-sm text-suave">
          Nada encontrado com esses filtros.
        </p>
      ) : (
        <ol className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-painel text-sm">
          {itens.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <time dateTime={e.em} className="w-24 shrink-0 tabular-nums text-suave">
                {formatarDataHora(e.em)}
              </time>
              <span className="min-w-0 flex-1 truncate font-medium">{e.cartaoTitulo}</span>
              <span className="text-suave">{descrever(e)}</span>
              {e.acimaDoWip && <span className="rounded-full bg-aviso/15 px-2 py-0.5 text-xs font-medium text-aviso">acima do WIP</span>}
              <span className="text-xs text-suave">por {nome(e.usuarioId)}</span>
            </li>
          ))}
        </ol>
      )}

      <nav aria-label="Páginas do histórico" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-suave tabular-nums">
          {total} {total === 1 ? "registro" : "registros"}, página {Math.min(pagina, paginas)} de {paginas}
        </span>
        <span className="flex gap-2">
          {pagina > 1 ? (
            <Link href={link(pagina - 1)} className="rounded-lg border border-linha px-3 py-1.5 hover:bg-elevado">
              ← Anterior
            </Link>
          ) : null}
          {pagina < paginas ? (
            <Link href={link(pagina + 1)} className="rounded-lg border border-linha px-3 py-1.5 hover:bg-elevado">
              Próxima →
            </Link>
          ) : null}
        </span>
      </nav>
    </section>
  );
}

function descrever(e: ItemHistorico) {
  switch (e.tipo) {
    case "movimento":
      return e.de ? `${e.de} → ${e.para}` : `Criado em ${e.para}`;
    case "responsavel":
      return e.detalhe ? `Responsável: ${e.detalhe}` : "Ficou sem responsável";
    case "bloqueio":
      return `Bloqueado: ${e.detalhe ?? ""}`;
    case "desbloqueio":
      return "Desbloqueado";
  }
}
