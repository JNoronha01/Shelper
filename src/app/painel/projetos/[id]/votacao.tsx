"use client";

import { useState, useTransition } from "react";
import { Aviso } from "@/app/(acesso)/campo";
import { BOTAO_MINI, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/botoes";
import { Seletor } from "@/components/seletor";
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
  // PO e SM conduzem (abrir, revelar, decidir, cancelar); todos votam.
  podeConduzir: boolean;
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

export function Votacoes({ projetoId, votacoes, votos, cartoes, totalMembros, meuId, limites, podeConduzir }: Props) {
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
          <p className="rounded-xl border border-dashed border-linha-forte p-6 text-center text-sm text-suave">
            {podeConduzir ? "Nenhuma votação aberta. Abra uma ao lado, ou pelo detalhe de um cartão." : "Nenhuma votação aberta. O PO ou o SM abre as votações."}
          </p>
        )}
        {ativas.map((v) => (
          <PainelVotacao
            key={v.id}
            votacao={v}
            titulo={titulo(v)}
            podeConduzir={podeConduzir}
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
        {podeConduzir && <NovaVotacao projetoId={projetoId} cartoes={cartoes} ativas={ativas} />}
        {encerradas.length > 0 && (
          <section aria-labelledby="titulo-decididas" className="rounded-2xl border border-linha bg-painel p-5">
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
  podeConduzir,
}: {
  votacao: Votacao;
  titulo: string;
  votos: Voto[];
  totalMembros: number;
  meuId: string;
  atual: number | null;
  podeConduzir: boolean;
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
    <article className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold break-words">{titulo}</h3>
          <p className="text-xs text-suave">
            Aberta em {formatarDataHora(votacao.criadoEm)}
            {atual !== null && ` · valor atual: ${atual}`}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            revelada
              ? "bg-bom/15 text-bom"
              : "bg-aviso/15 text-aviso"
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
                className={`h-14 w-11 rounded-xl border text-sm font-semibold tabular-nums transition duration-150 ease-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laranja disabled:opacity-60 ${
                  meu === valor
                    ? "-translate-y-1 border-laranja bg-laranja text-sobre-laranja shadow-[0_10px_20px_-10px_var(--color-laranja)]"
                    : "border-linha-forte bg-cartao hover:-translate-y-0.5 hover:border-fraco hover:bg-elevado"
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
          <li key={v.usuarioId} className="flex items-center gap-2 rounded-lg border border-linha px-3 py-1.5 text-sm">
            <span>{v.usuarioId === meuId ? "Você" : v.nome.split(" ")[0]}</span>
            <span
              className={`grid h-7 min-w-6 place-items-center rounded px-1 text-xs font-bold tabular-nums ${
                v.valor === null ? "bg-elevado text-suave" : "bg-elevado text-texto"
              }`}
            >
              {v.valor === null ? "✓" : v.valor}
              {v.valor === null && <span className="sr-only">votou (escondido)</span>}
            </span>
          </li>
        ))}
      </ul>

      {resumo && (
        <p className="text-sm text-suave">
          {resumo.consenso ? (
            <strong className="text-bom">Consenso: {resumo.sugestao}.</strong>
          ) : (
            <>
              Menor {resumo.menor}, maior {resumo.maior}, média {resumo.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}. Quem votou
              nos extremos explica, e o time decide (ou faz uma nova rodada).
            </>
          )}
        </p>
      )}

      {podeConduzir ? (
      <div className="flex flex-wrap items-end gap-2 border-t border-linha pt-4">
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
              <Seletor
                id={`final-${votacao.id}`}
                valor={escolhido}
                onChange={setFinal}
                opcoes={baralho.map((v) => ({ valor: String(v), rotulo: String(v) }))}
                className="w-28"
              />
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
      ) : (
        <p className="border-t border-linha pt-4 text-sm text-suave">
          {revelada ? "O PO ou o SM decide o valor final com o time." : "Quando todos votarem, o PO ou o SM revela os votos."}
        </p>
      )}
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
    <section aria-labelledby="titulo-nova-votacao" className="flex flex-col gap-4 rounded-2xl border border-linha bg-painel p-5">
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
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition duration-150 ease-suave ${
              tipo === id ? "border-linha-forte bg-elevado text-texto" : "border-linha text-suave hover:bg-elevado/50 hover:text-texto"
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
            <Seletor
              id="votar-cartao"
              valor={cartaoEscolhido}
              onChange={setCartao}
              opcoes={disponiveis.map((c) => ({ valor: c.id, rotulo: c.titulo, detalhe: `${c.pontos} pts · ${c.coluna}` }))}
            />
          </div>
        ) : (
          <p className="text-sm text-suave">Nenhum cartão disponível para votar.</p>
        )
      ) : colunas.length ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="votar-coluna" className="text-sm font-medium">
            Coluna
          </label>
          <Seletor
            id="votar-coluna"
            valor={colunaEscolhida}
            onChange={setColuna}
            opcoes={colunas.map((c) => ({ valor: c, rotulo: c }))}
          />
        </div>
      ) : (
        <p className="text-sm text-suave">As duas colunas já estão em votação.</p>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button
        type="button"
        aria-busy={ocupado}
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
