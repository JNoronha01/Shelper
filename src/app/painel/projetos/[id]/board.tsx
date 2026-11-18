"use client";

import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { BOTAO_MINI, BOTAO_PRINCIPAL } from "@/components/botoes";
import type { Cartao, Votacao } from "@/lib/board/dados";
import { limiteDaColuna, situacaoWip, type LimitesWip, type SituacaoWip } from "@/lib/board/regras";
import { COLUNAS, colunaAnterior, proximaColuna, type Coluna } from "@/lib/colunas";
import { moverCartao } from "../../acoes";
import { DetalheCartao } from "./detalhe-cartao";
import { NovoCartao } from "./novo-cartao";

const COR_DA_COLUNA: Record<Coluna, string> = {
  Backlog: "bg-zinc-400",
  "A fazer": "bg-sky-500",
  "Em andamento": "bg-indigo-500",
  "Em revisão": "bg-amber-500",
  Concluído: "bg-emerald-500",
};

const ESTILO_WIP: Record<SituacaoWip, { borda: string; selo: string; texto: string | null }> = {
  sem_limite: { borda: "border-zinc-200 dark:border-zinc-800", selo: "bg-zinc-200/70 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", texto: null },
  livre: { borda: "border-zinc-200 dark:border-zinc-800", selo: "bg-zinc-200/70 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", texto: null },
  no_limite: {
    borda: "border-amber-400 dark:border-amber-500/70",
    selo: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    texto: "No limite de WIP",
  },
  acima: {
    borda: "border-red-400 dark:border-red-500/70",
    selo: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    texto: "Acima do limite de WIP",
  },
};

type Mensagem = { tipo: "ok" | "erro" | "info"; texto: string } | null;

export function Board({
  projetoId,
  limites,
  cartoes,
  votacoes,
}: {
  projetoId: string;
  limites: LimitesWip;
  cartoes: Cartao[];
  votacoes: Votacao[];
}) {
  // A tela já mostra o cartão na coluna nova enquanto o servidor grava o evento.
  const [visiveis, moverNaTela] = useOptimistic(cartoes, (atual: Cartao[], m: { id: string; para: Coluna }) =>
    atual.map((c) => (c.id === m.id ? { ...c, coluna: m.para } : c)),
  );
  const [movendo, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Coluna | null>(null);
  // Pop-ups: criar cartão (com a coluna escolhida) e detalhe do cartão clicado.
  const [criarEm, setCriarEm] = useState<Coluna | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const detalhe = detalheId ? cartoes.find((c) => c.id === detalheId) ?? null : null;
  const emVotacao = new Set(votacoes.filter((v) => v.situacao !== "encerrada" && v.cartaoId).map((v) => v.cartaoId));

  function mover(cartao: Cartao, para: Coluna) {
    if (cartao.coluna === para) return;
    iniciar(async () => {
      moverNaTela({ id: cartao.id, para });
      let r = await moverCartao({ cartao: cartao.id, para, confirmarWip: false });
      if (r.status === "wip") {
        const confirmou = window.confirm(
          `A coluna "${r.coluna}" está no limite de WIP (${r.ocupados} de ${r.limite}).\n\n` +
            `Mover "${cartao.titulo}" mesmo assim? O evento ficará marcado como acima do limite.`,
        );
        if (!confirmou) {
          setMensagem({ tipo: "info", texto: `Movimentação cancelada: "${r.coluna}" está no limite de WIP.` });
          return;
        }
        r = await moverCartao({ cartao: cartao.id, para, confirmarWip: true });
      }
      if (r.status === "erro") setMensagem({ tipo: "erro", texto: r.mensagem });
      else if (r.status === "ok") {
        setMensagem({
          tipo: r.acimaDoWip ? "info" : "ok",
          texto: `"${cartao.titulo}" foi para ${para}${r.acimaDoWip ? ", acima do limite de WIP" : ""}.`,
        });
      }
    });
  }

  function soltar(e: DragEvent, coluna: Coluna) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const cartao = visiveis.find((c) => c.id === id);
    setAlvo(null);
    setArrastando(null);
    if (cartao) mover(cartao, coluna);
  }

  return (
    <section aria-label="Board" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setCriarEm("Backlog")} className={BOTAO_PRINCIPAL}>
          <span aria-hidden="true">+</span> Novo cartão
        </button>
        <p className="text-xs text-zinc-500">Clique no título de um cartão para ver o detalhe, a descrição e o checklist.</p>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={`min-h-6 text-sm ${
          mensagem?.tipo === "erro"
            ? "text-red-700 dark:text-red-400"
            : mensagem?.tipo === "info"
              ? "text-amber-700 dark:text-amber-300"
              : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {movendo ? "Gravando movimentação…" : mensagem?.texto}
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <ol className="grid min-w-max grid-flow-col auto-cols-[18rem] gap-4 xl:min-w-0 xl:auto-cols-fr">
          {COLUNAS.map((coluna) => {
            const daColuna = visiveis.filter((c) => c.coluna === coluna);
            const limite = limiteDaColuna(coluna, limites);
            const situacao = situacaoWip(daColuna.length, limite);
            const estilo = ESTILO_WIP[situacao];
            const pontos = daColuna.reduce((s, c) => s + c.pontos, 0);
            const idTitulo = `coluna-${COLUNAS.indexOf(coluna)}`;
            return (
              <li
                key={coluna}
                aria-labelledby={idTitulo}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (alvo !== coluna) setAlvo(coluna);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null);
                }}
                onDrop={(e) => soltar(e, coluna)}
                className={`flex min-h-80 flex-col gap-3 rounded-xl border-2 bg-zinc-100/70 p-3 transition-colors dark:bg-zinc-900/60 ${estilo.borda} ${
                  alvo === coluna && arrastando ? "!border-indigo-400 bg-indigo-50/70 dark:bg-indigo-500/10" : ""
                }`}
              >
                <header className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id={idTitulo} className="flex items-center gap-2 text-sm font-semibold">
                      <span aria-hidden="true" className={`size-2.5 rounded-full ${COR_DA_COLUNA[coluna]}`} />
                      {coluna}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCriarEm(coluna)}
                      className="ml-auto rounded-md px-1.5 text-base leading-none text-zinc-500 hover:bg-white hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-indigo-300"
                      aria-label={`Novo cartão em ${coluna}`}
                      title={`Novo cartão em ${coluna}`}
                    >
                      +
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${estilo.selo}`}
                      title={limite === null ? "Cartões na coluna" : `Cartões na coluna e limite de WIP`}
                    >
                      {limite === null ? daColuna.length : `${daColuna.length}/${limite}`}
                      <span className="sr-only">{limite === null ? " cartões" : ` cartões, limite ${limite}`}</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {pontos} {pontos === 1 ? "ponto" : "pontos"}
                    {estilo.texto && (
                      <strong className={`ml-2 font-semibold ${situacao === "acima" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-300"}`}>
                        {estilo.texto}
                      </strong>
                    )}
                  </p>
                </header>

                <ul className="flex flex-1 flex-col gap-2.5">
                  {daColuna.map((cartao) => (
                    <CartaoNoBoard
                      key={cartao.id}
                      cartao={cartao}
                      ocupado={movendo}
                      arrastado={arrastando === cartao.id}
                      onArrastar={setArrastando}
                      onMover={mover}
                      onAbrir={() => setDetalheId(cartao.id)}
                      emVotacao={emVotacao.has(cartao.id)}
                    />
                  ))}
                  {daColuna.length === 0 && (
                    <li className="grid flex-1 place-items-center rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
                      Arraste um cartão para cá
                    </li>
                  )}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-xs text-zinc-500">
        Dica: arraste os cartões entre as colunas ou use os botões Voltar e Avançar (também pelo teclado, com Tab e Enter).
      </p>

      <NovoCartao
        projetoId={projetoId}
        coluna={criarEm}
        onFechar={() => setCriarEm(null)}
        onCriado={(texto) => setMensagem({ tipo: "ok", texto })}
      />
      <DetalheCartao
        projetoId={projetoId}
        cartao={detalhe}
        emVotacao={detalhe ? emVotacao.has(detalhe.id) : false}
        onFechar={() => setDetalheId(null)}
      />
    </section>
  );
}

function CartaoNoBoard({
  cartao,
  ocupado,
  arrastado,
  onArrastar,
  onMover,
  onAbrir,
  emVotacao,
}: {
  cartao: Cartao;
  ocupado: boolean;
  arrastado: boolean;
  onArrastar: (id: string | null) => void;
  onMover: (cartao: Cartao, para: Coluna) => void;
  onAbrir: () => void;
  emVotacao: boolean;
}) {
  const anterior = colunaAnterior(cartao.coluna);
  const proxima = proximaColuna(cartao.coluna);
  const concluido = cartao.coluna === "Concluído";
  const feitos = cartao.checklist.filter((i) => i.feito).length;
  const total = cartao.checklist.length;

  return (
    <li
      draggable={!ocupado}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", cartao.id);
        e.dataTransfer.effectAllowed = "move";
        onArrastar(cartao.id);
      }}
      onDragEnd={() => onArrastar(null)}
      className={`group flex cursor-grab flex-col gap-3 rounded-lg border bg-white p-3.5 shadow-sm transition active:cursor-grabbing dark:bg-zinc-950 ${
        concluido ? "border-emerald-200 dark:border-emerald-500/30" : "border-zinc-200 dark:border-zinc-800"
      } ${arrastado ? "opacity-40" : "hover:border-indigo-300 hover:shadow dark:hover:border-indigo-500/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onAbrir}
          className={`text-left text-sm font-medium leading-snug break-words hover:text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:text-indigo-300 ${
            concluido ? "text-zinc-500 line-through decoration-emerald-500/60" : ""
          }`}
          aria-label={`Abrir o detalhe de "${cartao.titulo}"`}
        >
          {cartao.titulo}
        </button>
        <span
          className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
          title={`${cartao.pontos} pontos`}
        >
          {cartao.pontos}
          <span className="sr-only"> pontos</span>
        </span>
      </div>

      {(cartao.descricao || total > 0 || emVotacao) && (
        <ul className="flex flex-wrap gap-1.5 text-xs text-zinc-500" aria-label="Resumo do cartão">
          {cartao.descricao && (
            <li className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800" title="Tem descrição">
              <span aria-hidden="true">≡</span> Descrição
            </li>
          )}
          {total > 0 && (
            <li
              className={`rounded px-1.5 py-0.5 tabular-nums ${
                feitos === total ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
              title="Itens do checklist feitos"
            >
              <span aria-hidden="true">☑</span> {feitos}/{total}
            </li>
          )}
          {emVotacao && (
            <li className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Em votação</li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {anterior && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onMover(cartao, anterior)}
            className={BOTAO_MINI}
            aria-label={`Voltar "${cartao.titulo}" para ${anterior}`}
          >
            <span aria-hidden="true">←</span> Voltar
          </button>
        )}
        {proxima && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onMover(cartao, proxima)}
            className={BOTAO_MINI}
            aria-label={`Avançar "${cartao.titulo}" para ${proxima}`}
          >
            Avançar <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </li>
  );
}
