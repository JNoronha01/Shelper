"use client";

import { useActionState, useOptimistic, useState, useTransition, type DragEvent } from "react";
import { BOTAO_MINI, BOTAO_PRINCIPAL, CAMPO } from "@/components/botoes";
import type { Cartao } from "@/lib/board/dados";
import { PONTOS_VALIDOS, TITULO_MAXIMO, limiteDaColuna, situacaoWip, type LimitesWip, type SituacaoWip } from "@/lib/board/regras";
import { COLUNAS, colunaAnterior, proximaColuna, type Coluna } from "@/lib/colunas";
import { criarCartao, editarCartao, moverCartao } from "../../acoes";
import { ESTADO_INICIAL, type EstadoAcao } from "../../estado";

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

export function Board({ projetoId, limites, cartoes }: { projetoId: string; limites: LimitesWip; cartoes: Cartao[] }) {
  // A tela já mostra o cartão na coluna nova enquanto o servidor grava o evento.
  const [visiveis, moverNaTela] = useOptimistic(cartoes, (atual: Cartao[], m: { id: string; para: Coluna }) =>
    atual.map((c) => (c.id === m.id ? { ...c, coluna: m.para } : c)),
  );
  const [movendo, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Coluna | null>(null);

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
        <ol className="grid min-w-max grid-flow-col auto-cols-[16.5rem] gap-4 xl:min-w-0 xl:auto-cols-fr">
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

                {coluna === "Backlog" && <NovoCartao projetoId={projetoId} />}

                <ul className="flex flex-1 flex-col gap-2">
                  {daColuna.map((cartao) => (
                    <CartaoNoBoard
                      key={cartao.id}
                      cartao={cartao}
                      ocupado={movendo}
                      arrastado={arrastando === cartao.id}
                      onArrastar={setArrastando}
                      onMover={mover}
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
    </section>
  );
}

function CartaoNoBoard({
  cartao,
  ocupado,
  arrastado,
  onArrastar,
  onMover,
}: {
  cartao: Cartao;
  ocupado: boolean;
  arrastado: boolean;
  onArrastar: (id: string | null) => void;
  onMover: (cartao: Cartao, para: Coluna) => void;
}) {
  const [editando, setEditando] = useState(false);
  const anterior = colunaAnterior(cartao.coluna);
  const proxima = proximaColuna(cartao.coluna);
  const concluido = cartao.coluna === "Concluído";

  if (editando) {
    return (
      <li className="rounded-lg border border-indigo-300 bg-white p-3 shadow-sm dark:border-indigo-500/60 dark:bg-zinc-950">
        <EditarCartao cartao={cartao} onFechar={() => setEditando(false)} />
      </li>
    );
  }

  return (
    <li
      draggable={!ocupado}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", cartao.id);
        e.dataTransfer.effectAllowed = "move";
        onArrastar(cartao.id);
      }}
      onDragEnd={() => onArrastar(null)}
      className={`group flex cursor-grab flex-col gap-3 rounded-lg border bg-white p-3 shadow-sm transition active:cursor-grabbing dark:bg-zinc-950 ${
        concluido ? "border-emerald-200 dark:border-emerald-500/30" : "border-zinc-200 dark:border-zinc-800"
      } ${arrastado ? "opacity-40" : "hover:border-indigo-300 hover:shadow dark:hover:border-indigo-500/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug break-words ${concluido ? "text-zinc-500 line-through decoration-emerald-500/60" : ""}`}>
          {cartao.titulo}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded px-1 text-xs text-zinc-500 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:text-indigo-300"
            aria-label={`Editar "${cartao.titulo}"`}
          >
            Editar
          </button>
          <span
            className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            title={`${cartao.pontos} pontos`}
          >
            {cartao.pontos}
            <span className="sr-only"> pontos</span>
          </span>
        </div>
      </div>
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

function SeletorDePontos({ id, padrao, erro }: { id: string; padrao: string; erro?: string }) {
  return (
    <select
      id={id}
      name="pontos"
      defaultValue={padrao}
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? `${id}-erro` : undefined}
      className={`${CAMPO} w-20`}
    >
      {PONTOS_VALIDOS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-xs text-red-700 dark:text-red-400">
      {texto}
    </p>
  );
}

function NovoCartao({ projetoId }: { projetoId: string }) {
  const [estado, acao, enviando] = useActionState(criarCartao, ESTADO_INICIAL);

  return (
    <form
      key={estado.versao ?? 0}
      action={acao}
      noValidate
      className="flex flex-col gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/60 p-2.5 dark:border-zinc-700 dark:bg-zinc-950/40"
    >
      <input type="hidden" name="projeto" value={projetoId} />
      <label htmlFor="novo-titulo" className="sr-only">
        Título do novo cartão
      </label>
      <input
        id="novo-titulo"
        name="titulo"
        placeholder="Novo cartão…"
        maxLength={TITULO_MAXIMO}
        defaultValue={estado.erros || estado.mensagem ? estado.valores?.titulo : undefined}
        aria-invalid={estado.erros?.titulo ? true : undefined}
        aria-describedby={estado.erros?.titulo ? "novo-titulo-erro" : undefined}
        className={CAMPO}
      />
      <Erro id="novo-titulo-erro" texto={estado.erros?.titulo} />
      <div className="flex items-center gap-2">
        <label htmlFor="novo-pontos" className="text-xs text-zinc-500">
          Pontos
        </label>
        <SeletorDePontos id="novo-pontos" padrao={estado.valores?.pontos || "3"} erro={estado.erros?.pontos} />
        <button type="submit" disabled={enviando} className={`${BOTAO_PRINCIPAL} ml-auto !px-3 !py-2`}>
          {enviando ? "Criando…" : "Adicionar"}
        </button>
      </div>
      <Erro id="novo-pontos-erro" texto={estado.erros?.pontos} />
      {estado.mensagem && <p className="text-xs text-red-700 dark:text-red-400">{estado.mensagem}</p>}
      {estado.sucesso && (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">
          {estado.sucesso}
        </p>
      )}
    </form>
  );
}

function EditarCartao({ cartao, onFechar }: { cartao: Cartao; onFechar: () => void }) {
  const [estado, acao, enviando] = useActionState(async (anterior: EstadoAcao, form: FormData) => {
    const r = await editarCartao(anterior, form);
    if (r.sucesso) onFechar();
    return r;
  }, ESTADO_INICIAL);
  const id = `editar-${cartao.id}`;

  return (
    <form action={acao} noValidate className="flex flex-col gap-2">
      <input type="hidden" name="cartao" value={cartao.id} />
      <label htmlFor={`${id}-titulo`} className="text-xs font-medium">
        Título
      </label>
      <input
        id={`${id}-titulo`}
        name="titulo"
        defaultValue={estado.valores?.titulo ?? cartao.titulo}
        maxLength={TITULO_MAXIMO}
        autoFocus
        aria-invalid={estado.erros?.titulo ? true : undefined}
        aria-describedby={estado.erros?.titulo ? `${id}-titulo-erro` : undefined}
        className={CAMPO}
      />
      <Erro id={`${id}-titulo-erro`} texto={estado.erros?.titulo} />
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-pontos`} className="text-xs font-medium">
          Pontos
        </label>
        <SeletorDePontos id={`${id}-pontos`} padrao={estado.valores?.pontos ?? String(cartao.pontos)} erro={estado.erros?.pontos} />
      </div>
      <Erro id={`${id}-pontos-erro`} texto={estado.erros?.pontos} />
      {estado.mensagem && <p className="text-xs text-red-700 dark:text-red-400">{estado.mensagem}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className={`${BOTAO_PRINCIPAL} !px-3 !py-1.5`}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onFechar} className={BOTAO_MINI}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
