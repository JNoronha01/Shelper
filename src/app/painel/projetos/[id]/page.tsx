import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import { carregarBoard, carregarEventosParaCalculo, type Cartao, type Metas, type Sprint } from "@/lib/board/dados";
import { eUuid } from "@/lib/board/regras";
import { COLUNAS } from "@/lib/colunas";
import { diaLocal } from "@/lib/metricas/calculo";
import { montarPainel, PERIODO_TUDO } from "@/lib/metricas/painel";
import { Abas, eAba, type IdAba } from "./abas";
import { Board } from "./board";
import { ConfiguracaoWip } from "./configuracao-wip";
import { Historico } from "./historico";
import { Metricas } from "./metricas";
import { NovaSprint, SprintAtiva, SprintsEncerradas } from "./sprint";

export const metadata: Metadata = { title: "Board · Shelper" };

type Props = PageProps<"/painel/projetos/[id]">;

async function ConteudoProjeto({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id } = await params;
  const consulta = await searchParams;
  const aba: IdAba = eAba(consulta.aba) ? consulta.aba : "board";
  if (!eUuid(id)) notFound();
  const usuario = await exigirUsuario();
  const dados = await carregarBoard(id, usuario.id);
  // Projeto de outro time aparece como inexistente: o RLS não devolve a linha.
  if (!dados) notFound();

  const { projeto, papel, membros, cartoes, eventos, sprints, metas } = dados;
  const concluidos = cartoes.filter((c) => c.coluna === "Concluído");
  const agora = new Date().toISOString();
  const ativa = sprints.find((x) => !x.encerrada) ?? null;
  const backlog = cartoes.filter((c) => c.coluna === "Backlog");
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

      <Abas projetoId={projeto.id} atual={aba} />

      {aba === "board" && (
        <>
          {papel === "dono" && (
            <ConfiguracaoWip projetoId={projeto.id} andamento={projeto.wipAndamento} revisao={projeto.wipRevisao} />
          )}
          <Board
            projetoId={projeto.id}
            limites={{ wipAndamento: projeto.wipAndamento, wipRevisao: projeto.wipRevisao }}
            cartoes={cartoes}
          />
        </>
      )}

      {aba === "sprint" && (
        <div className="flex flex-col gap-6">
          {ativa ? (
            <SprintAtiva sprint={ativa} cartoes={cartoes} backlog={backlog} />
          ) : (
            <NovaSprint projetoId={projeto.id} backlog={backlog} hoje={diaLocal(agora)} numero={sprints.length + 1} />
          )}
          <SprintsEncerradas sprints={sprints.filter((s) => s.encerrada)} cartoes={cartoes} />
        </div>
      )}
      {aba === "metricas" && (
        <AbaMetricas
          projetoId={projeto.id}
          cartoes={cartoes}
          sprints={sprints}
          metas={metas}
          escolhida={typeof consulta.periodo === "string" ? consulta.periodo : "tudo"}
          agora={agora}
        />
      )}
      {aba === "historico" && <Historico eventos={eventos} />}
    </>
  );
}

// Só carrega todos os eventos quando a aba Métricas é aberta.
async function AbaMetricas({
  projetoId,
  cartoes,
  sprints,
  metas,
  escolhida,
  agora,
}: {
  projetoId: string;
  cartoes: Cartao[];
  sprints: Sprint[];
  metas: Metas;
  escolhida: string;
  agora: string;
}) {
  const eventos = await carregarEventosParaCalculo(projetoId);
  const sprint = sprints.find((s) => s.id === escolhida);
  const periodo = sprint ? { inicio: sprint.inicio, fim: sprint.fim } : PERIODO_TUDO;
  const painel = montarPainel(cartoes, eventos, periodo, metas, agora);
  return <Metricas projetoId={projetoId} painel={painel} metas={metas} sprints={sprints} escolhida={sprint ? sprint.id : "tudo"} />;
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

export default function PaginaProjeto({ params, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<CarregandoBoard />}>
        <ConteudoProjeto params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
