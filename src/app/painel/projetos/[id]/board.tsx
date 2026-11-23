"use client";

import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { useAvisar } from "@/components/avisos";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Modal } from "@/components/modal";
import type { Cartao, Membro, Votacao } from "@/lib/board/dados";
import { alertasDoBoard, formatarDuracao, prazoDoCartao } from "@/lib/board/gargalo";
import { limiteDaColuna, situacaoWip, type LimitesWip, type SituacaoWip } from "@/lib/board/regras";
import { COLUNAS, colunaAnterior, proximaColuna, type Coluna } from "@/lib/colunas";
import { pode, type Funcao } from "@/lib/board/papeis";
import { moverCartao } from "../../acoes";
import { DetalheCartao } from "./detalhe-cartao";
import { NovoCartao } from "./novo-cartao";

// Cor só no que importa: "Em andamento" é onde o trabalho acontece (laranja);
// "Concluído" fecha o fluxo (verde fechado). As outras colunas ficam neutras.
const COR_DA_COLUNA: Record<Coluna, string> = {
  Backlog: "bg-fraco",
  "A fazer": "bg-suave",
  "Em andamento": "bg-laranja",
  "Em revisão": "bg-texto/70",
  Concluído: "bg-bom",
};

const ESTILO_WIP: Record<SituacaoWip, { borda: string; selo: string; texto: string | null }> = {
  sem_limite: { borda: "border-linha", selo: "bg-elevado text-suave", texto: null },
  livre: { borda: "border-linha", selo: "bg-elevado text-suave", texto: null },
  no_limite: { borda: "border-aviso/50", selo: "bg-aviso/15 text-aviso", texto: "No limite de WIP" },
  acima: { borda: "border-perigo/50", selo: "bg-perigo/15 text-perigo", texto: "Acima do limite de WIP" },
};

type Pendente = { cartao: Cartao; para: Coluna; limite: number; ocupados: number };

export function Board({
  projetoId,
  limites,
  cartoes,
  votacoes,
  funcao,
  time,
  agora,
  meuId,
}: {
  projetoId: string;
  meuId: string;
  limites: LimitesWip;
  cartoes: Cartao[];
  votacoes: Votacao[];
  funcao: Funcao;
  time: Membro[];
  // Hora do servidor ao montar a página: base do prazo de cada cartão.
  agora: string;
}) {
  // Só o PO cria cartões; o desenvolvedor e o SM movem (o banco confere de novo).
  const podeCriar = pode(funcao, "criarCartao");
  // A tela já mostra o cartão na coluna nova enquanto o servidor grava o evento.
  const [visiveis, moverNaTela] = useOptimistic(cartoes, (atual: Cartao[], m: { id: string; para: Coluna }) =>
    atual.map((c) => (c.id === m.id ? { ...c, coluna: m.para } : c)),
  );
  const [movendo, iniciar] = useTransition();
  const avisar = useAvisar();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Coluna | null>(null);
  // Pop-ups: criar cartão (com a coluna escolhida), detalhe do cartão e confirmação de WIP.
  const [criarEm, setCriarEm] = useState<Coluna | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const detalhe = detalheId ? cartoes.find((c) => c.id === detalheId) ?? null : null;
  const emVotacao = new Set(votacoes.filter((v) => v.situacao !== "encerrada" && v.cartaoId).map((v) => v.cartaoId));

  function mover(cartao: Cartao, para: Coluna, confirmarWip = false) {
    if (cartao.coluna === para) return;
    iniciar(async () => {
      moverNaTela({ id: cartao.id, para });
      const r = await moverCartao({ cartao: cartao.id, para, confirmarWip });
      // Coluna cheia: o cartão volta para o lugar e a tela pergunta antes de passar do limite.
      if (r.status === "wip") setPendente({ cartao, para, limite: r.limite, ocupados: r.ocupados });
      else if (r.status === "erro") avisar(r.mensagem, "erro");
      else if (r.status === "ok") {
        avisar(`"${cartao.titulo}" foi para ${para}${r.acimaDoWip ? ", acima do limite de WIP" : ""}.`, r.acimaDoWip ? "info" : "ok");
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
    <section aria-label="Board" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {podeCriar ? (
          <button type="button" onClick={() => setCriarEm("Backlog")} className={BOTAO_PRINCIPAL}>
            <span aria-hidden="true" className="text-base leading-none">+</span> Novo cartão
          </button>
        ) : (
          <span />
        )}
        <p className="text-sm text-suave">
          {movendo ? "Gravando…" : "Arraste os cartões entre as colunas. Clique no título para abrir o detalhe."}
        </p>
      </div>

      {pode(funcao, "verMetricasTime") && (
        <PainelAtencao cartoes={visiveis} time={time} agora={agora} onAbrir={setDetalheId} />
      )}

      <div className="sem-barra -mx-4 overflow-x-auto px-4 pb-2">
        <ol className="grid min-w-max grid-flow-col auto-cols-[17.5rem] gap-3 xl:min-w-0 xl:auto-cols-fr">
          {COLUNAS.map((coluna) => {
            const daColuna = visiveis.filter((c) => c.coluna === coluna);
            const limite = limiteDaColuna(coluna, limites);
            const situacao = situacaoWip(daColuna.length, limite);
            const estilo = ESTILO_WIP[situacao];
            const pontos = daColuna.reduce((s, c) => s + c.pontos, 0);
            const idTitulo = `coluna-${COLUNAS.indexOf(coluna)}`;
            const ehAlvo = alvo === coluna && arrastando !== null;
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
                className={`flex h-[calc(100dvh-20rem)] min-h-[22rem] flex-col gap-3 rounded-coluna border bg-painel p-2.5 transition duration-200 ease-suave ${estilo.borda} ${
                  ehAlvo ? "!border-laranja/70 bg-laranja/[0.04] ring-4 ring-laranja/10" : ""
                }`}
              >
                <header className="flex flex-col gap-0.5 px-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className={`size-2 rounded-full ${COR_DA_COLUNA[coluna]}`} />
                    <h3 id={idTitulo} className="text-sm font-semibold">
                      {coluna}
                    </h3>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors ${estilo.selo}`}
                      title={limite === null ? "Cartões na coluna" : "Cartões na coluna / limite de WIP"}
                    >
                      {limite === null ? daColuna.length : `${daColuna.length}/${limite}`}
                      <span className="sr-only">{limite === null ? " cartões" : ` cartões, limite ${limite}`}</span>
                    </span>
                  </div>
                  <p className="pl-4 text-xs text-suave">
                    {pontos} {pontos === 1 ? "ponto" : "pontos"}
                    {estilo.texto && (
                      <span className={`ml-1.5 font-medium ${situacao === "acima" ? "text-perigo" : "text-aviso"}`}>· {estilo.texto}</span>
                    )}
                  </p>
                </header>

                {/* Cada coluna rola sozinha: com muitos cartões, a página não cresce sem fim. */}
                <ul className="-mr-1.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-gutter:stable]">
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
                      responsavel={time.find((m) => m.usuarioId === cartao.responsavelId) ?? null}
                      agora={agora}
                    />
                  ))}
                </ul>

                {podeCriar ? (
                  <button
                    type="button"
                    onClick={() => setCriarEm(coluna)}
                    className={`mt-auto flex items-center gap-2 rounded-cartao px-2.5 py-2 text-left text-sm text-fraco transition duration-150 ease-suave hover:bg-elevado hover:text-texto focus-visible:outline-2 focus-visible:outline-laranja ${
                      daColuna.length === 0 ? "border border-dashed border-linha-forte" : ""
                    }`}
                    aria-label={`Adicionar cartão em ${coluna}`}
                  >
                    <span aria-hidden="true" className="text-base leading-none">+</span>
                    {daColuna.length === 0 ? "Adicionar ou soltar aqui" : "Adicionar cartão"}
                  </button>
                ) : (
                  daColuna.length === 0 && (
                    <p className="mt-auto rounded-cartao border border-dashed border-linha-forte px-2.5 py-2 text-sm text-fraco">Solte um cartão aqui</p>
                  )
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <NovoCartao projetoId={projetoId} coluna={criarEm} onFechar={() => setCriarEm(null)} onCriado={(texto) => avisar(texto)} time={time} />
      <DetalheCartao
        projetoId={projetoId}
        podeEditar={podeCriar}
        podeConduzir={pode(funcao, "conduzirVotacao")}
        time={time}
        meuId={meuId}
        agora={agora}
        cartao={detalhe}
        emVotacao={detalhe ? emVotacao.has(detalhe.id) : false}
        onFechar={() => setDetalheId(null)}
      />
      <Modal aberto={pendente !== null} onFechar={() => setPendente(null)} titulo="Coluna no limite de WIP">
        {pendente && (
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-suave">
              <strong className="font-medium text-texto">{pendente.para}</strong> já tem {pendente.ocupados} de {pendente.limite} cartões.
              Mover <strong className="font-medium text-texto">&ldquo;{pendente.cartao.titulo}&rdquo;</strong> mesmo assim? O evento fica
              marcado como acima do limite e aparece nas métricas.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendente(null)} className={BOTAO_SECUNDARIO} autoFocus>
                Não mover
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = pendente;
                  setPendente(null);
                  mover(p.cartao, p.para, true);
                }}
                className={BOTAO_PRINCIPAL}
              >
                Mover mesmo assim
              </button>
            </div>
          </div>
        )}
      </Modal>
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
  responsavel,
  agora,
}: {
  cartao: Cartao;
  ocupado: boolean;
  arrastado: boolean;
  onArrastar: (id: string | null) => void;
  onMover: (cartao: Cartao, para: Coluna) => void;
  onAbrir: () => void;
  emVotacao: boolean;
  responsavel: Membro | null;
  agora: string;
}) {
  const prazo = prazoDoCartao(cartao, agora);
  const atrasado = Boolean(prazo?.atrasado);
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
      className={`pousar group flex cursor-grab flex-col gap-2.5 rounded-cartao border bg-cartao p-3 transition duration-150 ease-suave active:cursor-grabbing ${
        atrasado || cartao.bloqueado ? "alerta border-perigo/70" : concluido ? "border-linha/60 bg-cartao/60" : "border-linha"
      } ${arrastado ? "scale-[0.98] opacity-40" : "hover:-translate-y-px hover:border-linha-forte hover:shadow-[0_8px_20px_-12px_rgb(0_0_0/0.9)]"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onAbrir}
          className={`rounded text-left text-sm font-medium leading-snug break-words transition-colors hover:text-laranja-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laranja ${
            concluido ? "text-suave line-through decoration-bom/50" : ""
          }`}
          aria-label={`Abrir o detalhe de "${cartao.titulo}"`}
        >
          {cartao.titulo}
        </button>
        <span
          className="shrink-0 rounded-md bg-elevado px-1.5 py-0.5 text-xs font-semibold tabular-nums text-texto"
          title={`${cartao.pontos} pontos`}
        >
          {cartao.pontos}
          <span className="sr-only"> pontos</span>
        </span>
      </div>

      {(atrasado || cartao.bloqueado) && (
        <p className="flex flex-col gap-0.5 rounded-md bg-perigo/10 px-2 py-1.5 text-xs text-perigo">
          {atrasado && prazo && (
            <span className="font-medium">
              Gargalo: {formatarDuracao(prazo.decorridoHoras)} de {formatarDuracao(prazo.estimadoHoras)} estimadas
            </span>
          )}
          {cartao.bloqueado && <span className="line-clamp-2">Bloqueado: {cartao.motivoBloqueio}</span>}
        </p>
      )}

      {(cartao.descricao || total > 0 || emVotacao) && (
        <ul className="flex flex-wrap gap-1.5 text-[11px] font-medium text-suave" aria-label="Resumo do cartão">
          {cartao.descricao && (
            <li className="rounded-md bg-elevado/70 px-1.5 py-0.5" title="Tem descrição">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="mr-1 inline size-3 align-[-1px]">
                <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Descrição
            </li>
          )}
          {total > 0 && (
            <li
              className={`rounded-md px-1.5 py-0.5 tabular-nums ${
                feitos === total ? "bg-bom/15 text-bom" : "bg-elevado/70"
              }`}
              title="Itens do checklist feitos"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="mr-1 inline size-3 align-[-1px]">
                <rect x="2" y="2" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {feitos}/{total}
            </li>
          )}
          {emVotacao && (
            <li className="rounded-md bg-laranja/10 px-1.5 py-0.5 text-laranja-claro">Em votação</li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 transition-opacity duration-150 md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
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
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-suave">
          {cartao.horasEstimadas !== null ? (
            <span className="tabular-nums" title="Horas estimadas">
              {formatarDuracao(cartao.horasEstimadas)}
            </span>
          ) : (
            !concluido && <span title="Sem horas estimadas">sem estimativa</span>
          )}
          {responsavel ? (
            <span
              className="grid size-6 place-items-center rounded-full border border-linha-forte bg-elevado text-[10px] font-semibold text-texto"
              title={`Responsável: ${responsavel.nome}`}
            >
              {iniciais(responsavel.nome)}
              <span className="sr-only">Responsável: {responsavel.nome}</span>
            </span>
          ) : (
            <span className="grid size-6 place-items-center rounded-full border border-dashed border-linha-forte text-[10px]" title="Sem responsável">
              <span aria-hidden="true">?</span>
              <span className="sr-only">Sem responsável</span>
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

// "Jorge Noronha" -> "JN"; "Andryws" -> "A".
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "?") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Painel Atenção (PO e SM): cartões que passaram do tempo estimado ou estão bloqueados,
// com quem, o quê, há quanto tempo e por quê (pedido do professor em 21/11).
function PainelAtencao({
  cartoes,
  time,
  agora,
  onAbrir,
}: {
  cartoes: Cartao[];
  time: Membro[];
  agora: string;
  onAbrir: (id: string) => void;
}) {
  const alertas = alertasDoBoard(cartoes, agora);
  if (alertas.length === 0) return null;
  const porId = new Map(cartoes.map((c) => [c.id, c]));
  const nome = (id: string | null) => time.find((m) => m.usuarioId === id)?.nome ?? "Sem responsável";

  return (
    <details className="group alerta rounded-2xl border border-perigo/50 bg-perigo/[0.07]">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-2.5 text-sm marker:hidden focus-visible:outline-2 focus-visible:outline-laranja [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="size-2 rounded-full bg-perigo" />
        <strong className="font-semibold text-perigo">
          {alertas.length} {alertas.length === 1 ? "cartão pede" : "cartões pedem"} atenção
        </strong>
        <span className="text-suave">atrasados ou bloqueados</span>
        <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-auto size-4 text-suave transition-transform duration-200 ease-suave group-open:rotate-180">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="surgir overflow-x-auto border-t border-perigo/30 px-4 py-3">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs text-suave">
            <tr>
              <th className="py-1.5 pr-3 font-medium">O quê</th>
              <th className="py-1.5 pr-3 font-medium">Quem</th>
              <th className="py-1.5 pr-3 font-medium">Onde</th>
              <th className="py-1.5 pr-3 font-medium">Há quanto tempo</th>
              <th className="py-1.5 font-medium">Por quê</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {alertas.map((a) => {
              const c = porId.get(a.cartaoId)!;
              return (
                <tr key={a.cartaoId}>
                  <td className="py-2 pr-3">
                    <button type="button" onClick={() => onAbrir(c.id)} className="text-left font-medium hover:text-laranja-claro focus-visible:outline-2 focus-visible:outline-laranja">
                      {c.titulo}
                    </button>
                  </td>
                  <td className="py-2 pr-3">{nome(c.responsavelId)}</td>
                  <td className="py-2 pr-3 text-suave">{c.coluna}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {a.prazo?.atrasado
                      ? `${formatarDuracao(a.prazo.decorridoHoras)} (estimado ${formatarDuracao(a.prazo.estimadoHoras)})`
                      : c.bloqueadoEm
                        ? `bloqueado há ${formatarDuracao((Date.parse(agora) - Date.parse(c.bloqueadoEm)) / 3_600_000)}`
                        : "–"}
                  </td>
                  <td className="py-2 text-suave">
                    {[a.prazo?.atrasado && "Passou do tempo estimado", c.bloqueado && `Bloqueado: ${c.motivoBloqueio}`].filter(Boolean).join(". ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
