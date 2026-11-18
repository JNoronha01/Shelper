"use client";

import { useState, useTransition } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, CAMPO } from "@/components/botoes";
import type { Cartao, Votacao, Voto } from "@/lib/board/dados";
import { formatarDataHora, resumoDosVotos, valoresDaVotacao, type LimitesWip, type TipoVotacao } from "@/lib/board/regras";
import { abrirVotacao, cancelarVotacao, encerrarVotacao, novaRodada, revelarVotacao, votar } from "../../acoes";
import type { ResultadoSimples } from "../../estado";

// Aba Votação: Planning Poker (ideia do professor). Cada um vota escondido; quando o time
// clica em Revelar, todos veem os votos; o time escolhe o valor final e ele é aplicado
// nos pontos do cartão ou no limite de WIP da coluna. Atualiza ao recarregar a página.

type Props = {
  projetoId: string;
  votacoes: Votacao[];
  votos: Voto[];
  cartoes: Cartao[];
  totalMembros: number;
  meuId: string;
  limites: LimitesWip;
};

function useAcao() {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const executar = (fn: () => Promise<ResultadoSimples>) => {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setErro(r.mensagem);
    });
  };
  return { ocupado, erro, executar };
}

export function Votacoes({ projetoId, votacoes, votos, cartoes, totalMembros, meuId, limites }: Props) {
  const ativas = votacoes.filter((v) => v.situacao !== "encerrada");
  const encerradas = votacoes.filter((v) => v.situacao === "encerrada");
  const titulo = (v: Votacao) => {
    if (v.tipo === "wip") return `Limite de WIP · ${v.coluna}`;
    return `Pontos · ${cartoes.find((c) => c.id === v.cartaoId)?.titulo ?? "cartão removido"}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold">Em andamento</h2>
        {ativas.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nenhuma votação aberta. Abra uma ao lado, ou pelo detalhe de um cartão.
          </p>
        )}
        {ativas.map((v) => (
          <PainelVotacao
            key={v.id}
            votacao={v}
            titulo={titulo(v)}
            votos={votos.filter((x) => x.votacaoId === v.id)}
            totalMembros={totalMembros}
            meuId={meuId}
            atual={
              v.tipo === "wip"
                ? v.coluna === "Em andamento"
                  ? limites.wipAndamento
                  : limites.wipRevisao
                : cartoes.find((c) => c.id === v.cartaoId)?.pontos ?? null
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <NovaVotacao projetoId={projetoId} cartoes={cartoes} ativas={ativas} />
        {encerradas.length > 0 && (
          <section aria-labelledby="titulo-decididas" className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="titulo-decididas" className="mb-3 font-semibold">
              Decididas
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {encerradas.map((v) => (
                <li key={v.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{titulo(v)}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{v.resultado}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function PainelVotacao({
  votacao,
  titulo,
  votos,
  totalMembros,
  meuId,
  atual,
}: {
  votacao: Votacao;
  titulo: string;
  votos: Voto[];
  totalMembros: number;
  meuId: string;
  atual: number | null;
}) {
  const { ocupado, erro, executar } = useAcao();
  const tipo: TipoVotacao = votacao.tipo;
  const baralho = valoresDaVotacao(tipo);
  const meu = votos.find((v) => v.usuarioId === meuId)?.valor ?? null;
  const revelada = votacao.situacao === "revelada";
  const resumo = revelada ? resumoDosVotos(tipo, votos.map((v) => v.valor).filter((v): v is number => v !== null)) : null;
  const [final, setFinal] = useState<string>("");
  const escolhido = final || String(resumo?.sugestao ?? "");

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold break-words">{titulo}</h3>
          <p className="text-xs text-zinc-500">
            Aberta em {formatarDataHora(votacao.criadoEm)}
            {atual !== null && ` · valor atual: ${atual}`}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            revelada
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          }`}
        >
          {revelada ? "Votos revelados" : `${votos.length} de ${totalMembros} votaram`}
        </span>
      </header>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {!revelada && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{meu === null ? "Seu voto (ninguém vê até revelar)" : `Seu voto: ${meu} (pode trocar)`}</legend>
          <div className="flex flex-wrap gap-2">
            {baralho.map((valor) => (
              <button
                key={valor}
                type="button"
                disabled={ocupado}
                aria-pressed={meu === valor}
                onClick={() => executar(() => votar(votacao.id, tipo, valor))}
                className={`h-14 w-11 rounded-lg border-2 text-sm font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 ${
                  meu === valor
                    ? "-translate-y-1 border-indigo-600 bg-indigo-600 text-white shadow-md dark:border-indigo-400 dark:bg-indigo-500"
                    : "border-zinc-300 bg-white hover:-translate-y-0.5 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950"
                }`}
              >
                {valor}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <ul className="flex flex-wrap gap-2" aria-label="Votos">
        {votos.map((v) => (
          <li key={v.usuarioId} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700">
            <span>{v.usuarioId === meuId ? "Você" : v.nome.split(" ")[0]}</span>
            <span
              className={`grid h-7 min-w-6 place-items-center rounded px-1 text-xs font-bold tabular-nums ${
                v.valor === null ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-800" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              }`}
            >
              {v.valor === null ? "✓" : v.valor}
              {v.valor === null && <span className="sr-only">votou (escondido)</span>}
            </span>
          </li>
        ))}
      </ul>

      {resumo && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {resumo.consenso ? (
            <strong className="text-emerald-700 dark:text-emerald-400">Consenso: {resumo.sugestao}.</strong>
          ) : (
            <>
              Menor {resumo.menor}, maior {resumo.maior}, média {resumo.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}. Quem votou
              nos extremos explica, e o time decide (ou faz uma nova rodada).
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {!revelada ? (
          <button
            type="button"
            disabled={ocupado || votos.length === 0}
            onClick={() => executar(() => revelarVotacao(votacao.id))}
            className={BOTAO_PRINCIPAL}
          >
            Revelar votos
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor={`final-${votacao.id}`} className="text-xs font-medium">
                Valor final
              </label>
              <select id={`final-${votacao.id}`} value={escolhido} onChange={(e) => setFinal(e.target.value)} className={`${CAMPO} w-24`}>
                {baralho.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={ocupado || !escolhido}
              onClick={() => executar(() => encerrarVotacao(votacao.id, tipo, Number(escolhido)))}
              className={BOTAO_PRINCIPAL}
            >
              {tipo === "pontos" ? "Aplicar nos pontos" : "Aplicar no WIP"}
            </button>
            <button type="button" disabled={ocupado} onClick={() => executar(() => novaRodada(votacao.id))} className={BOTAO_SECUNDARIO}>
              Nova rodada
            </button>
          </>
        )}
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            if (window.confirm("Cancelar esta votação? Os votos serão apagados.")) executar(() => cancelarVotacao(votacao.id));
          }}
          className={`${BOTAO_MINI} ml-auto`}
        >
          Cancelar votação
        </button>
      </div>
    </article>
  );
}

function NovaVotacao({ projetoId, cartoes, ativas }: { projetoId: string; cartoes: Cartao[]; ativas: Votacao[] }) {
  const { ocupado, erro, executar } = useAcao();
  const [tipo, setTipo] = useState<TipoVotacao>("pontos");
  const emVotacao = new Set(ativas.map((v) => v.cartaoId));
  const colunasEmVotacao = new Set(ativas.map((v) => v.coluna));
  const disponiveis = cartoes.filter((c) => c.coluna !== "Concluído" && !emVotacao.has(c.id));
  const colunas = (["Em andamento", "Em revisão"] as const).filter((c) => !colunasEmVotacao.has(c));
  const [cartao, setCartao] = useState("");
  const [coluna, setColuna] = useState("");
  const cartaoEscolhido = cartao || disponiveis[0]?.id || "";
  const colunaEscolhida = coluna || colunas[0] || "";

  return (
    <section aria-labelledby="titulo-nova-votacao" className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 id="titulo-nova-votacao" className="font-semibold">
        Abrir votação
      </h2>
      <div role="radiogroup" aria-label="O que votar" className="grid grid-cols-2 gap-2">
        {(
          [
            ["pontos", "Pontos de um cartão"],
            ["wip", "Limite de WIP"],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={tipo === id}
            onClick={() => setTipo(id)}
            className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${
              tipo === id ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300" : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {tipo === "pontos" ? (
        disponiveis.length ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="votar-cartao" className="text-sm font-medium">
              Cartão
            </label>
            <select id="votar-cartao" value={cartaoEscolhido} onChange={(e) => setCartao(e.target.value)} className={CAMPO}>
              {disponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo} ({c.pontos} pts · {c.coluna})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum cartão disponível para votar.</p>
        )
      ) : colunas.length ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="votar-coluna" className="text-sm font-medium">
            Coluna
          </label>
          <select id="votar-coluna" value={colunaEscolhida} onChange={(e) => setColuna(e.target.value)} className={CAMPO}>
            {colunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">As duas colunas já estão em votação.</p>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button
        type="button"
        disabled={ocupado || (tipo === "pontos" ? !cartaoEscolhido : !colunaEscolhida)}
        onClick={() =>
          executar(() =>
            abrirVotacao(
              tipo === "pontos"
                ? { projeto: projetoId, tipo, cartao: cartaoEscolhido }
                : { projeto: projetoId, tipo, coluna: colunaEscolhida },
            ),
          )
        }
        className={BOTAO_PRINCIPAL}
      >
        {ocupado ? "Abrindo…" : "Abrir votação"}
      </button>
    </section>
  );
}
