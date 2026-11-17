import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { carregarBoard } from "@/lib/board/dados";
import { eUuid, formatarDataHora } from "@/lib/board/regras";
import { COLUNAS } from "@/lib/colunas";
import { Board } from "./board";
import { ConfiguracaoWip } from "./configuracao-wip";

export const metadata: Metadata = { title: "Board · Shelper" };

async function ConteudoProjeto({ params }: { params: PageProps<"/painel/projetos/[id]">["params"] }) {
  const { id } = await params;
  if (!eUuid(id)) notFound();
  const usuario = await exigirUsuario();
  const dados = await carregarBoard(id, usuario.id);
  // Projeto de outro time aparece como inexistente: o RLS não devolve a linha.
  if (!dados) notFound();

  const { projeto, papel, membros, cartoes, eventos } = dados;
  const concluidos = cartoes.filter((c) => c.coluna === "Concluído");
  const pontosTotais = cartoes.reduce((s, c) => s + c.pontos, 0);
  const pontosConcluidos = concluidos.reduce((s, c) => s + c.pontos, 0);

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/painel" className="text-sm text-zinc-500 hover:text-indigo-700 dark:hover:text-indigo-300">
            ← Meus projetos
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{projeto.nome}</h1>
          <p className="text-sm text-zinc-500">
            {papel === "dono" ? "Você é o dono" : "Você é membro"} · {membros} {membros === 1 ? "integrante" : "integrantes"}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          {[
            ["Cartões", String(cartoes.length)],
            ["Concluídos", String(concluidos.length)],
            ["Pontos feitos", `${pontosConcluidos}/${pontosTotais}`],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <dt className="text-xs text-zinc-500">{rotulo}</dt>
              <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      {papel === "dono" && (
        <ConfiguracaoWip projetoId={projeto.id} andamento={projeto.wipAndamento} revisao={projeto.wipRevisao} />
      )}

      <Board
        projetoId={projeto.id}
        limites={{ wipAndamento: projeto.wipAndamento, wipRevisao: projeto.wipRevisao }}
        cartoes={cartoes}
      />

      <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-historico" className="font-semibold">
            Histórico de movimentações
          </h2>
          <p className="text-sm text-zinc-500">
            Cada criação e movimentação vira um evento com a hora do servidor. Os eventos não podem ser editados nem apagados
            e são a base das métricas.
          </p>
        </div>
        {eventos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nenhum evento ainda. Crie um cartão no Backlog para começar.
          </p>
        ) : (
          <ol className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {eventos.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <time dateTime={e.em} className="w-24 shrink-0 tabular-nums text-zinc-500">
                  {formatarDataHora(e.em)}
                </time>
                <span className="min-w-0 flex-1 truncate font-medium">{e.titulo}</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {e.de ? (
                    <>
                      {e.de} <span aria-hidden="true">→</span>
                      <span className="sr-only">para</span> {e.para}
                    </>
                  ) : (
                    <>Criado no {e.para}</>
                  )}
                </span>
                {e.acimaDoWip && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    acima do WIP
                  </span>
                )}
                <span className="text-xs text-zinc-500">{e.meu ? "por você" : "por outro integrante"}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function CarregandoBoard() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p className="sr-only">Carregando o board…</p>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-4 overflow-hidden">
        {COLUNAS.map((c) => (
          <div key={c} className="h-72 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        ))}
      </div>
    </div>
  );
}

export default function PaginaProjeto({ params }: PageProps<"/painel/projetos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<CarregandoBoard />}>
        <ConteudoProjeto params={params} />
      </Suspense>
    </main>
  );
}
