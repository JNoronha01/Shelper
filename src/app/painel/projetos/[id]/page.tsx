import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth/usuario";
import {
  carregarBoard,
  carregarConvite,
  carregarEventosParaCalculo,
  carregarMembros,
  carregarVotos,
  type Cartao,
  type Metas,
  type Sprint,
  type Votacao,
} from "@/lib/board/dados";
import type { LimitesWip } from "@/lib/board/regras";
import { eUuid } from "@/lib/board/regras";
import { COLUNAS } from "@/lib/colunas";
import { abasDoPapel, NOME_DA_FUNCAO, pode, type Funcao } from "@/lib/board/papeis";
import { diaLocal } from "@/lib/metricas/calculo";
import { montarPainel, PERIODO_TUDO } from "@/lib/metricas/painel";
import { Abas, eAba, type IdAba } from "./abas";
import { Board } from "./board";
import { FaixaSprint } from "./faixa-sprint";
import { Historico } from "./historico";
import { Metricas } from "./metricas";
import { AbaProjeto } from "./projeto";
import { NovaSprint, SprintAtiva, SprintsEncerradas } from "./sprint";
import { Time } from "./time";
import { Votacoes } from "./votacao";

export const metadata: Metadata = { title: "Board · Shelper" };

type Props = PageProps<"/painel/projetos/[id]">;

async function ConteudoProjeto({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { id } = await params;
  const consulta = await searchParams;
  if (!eUuid(id)) notFound();
  const usuario = await exigirUsuario();
  const dados = await carregarBoard(id, usuario.id);
  // Projeto de outro time aparece como inexistente: o RLS não devolve a linha.
  if (!dados) notFound();

  const { projeto, funcao, membros, cartoes, eventos, sprints, metas, votacoes } = dados;
  // Cada papel vê só as abas que usa; uma aba de fora (link antigo) cai no Board.
  const visiveis = abasDoPapel(funcao);
  const aba: IdAba = eAba(consulta.aba) && visiveis.includes(consulta.aba) ? consulta.aba : "board";
  const limites = { wipAndamento: projeto.wipAndamento, wipRevisao: projeto.wipRevisao };
  const concluidos = cartoes.filter((c) => c.coluna === "Concluído");
  const agora = new Date().toISOString();
  const ativa = sprints.find((x) => !x.encerrada) ?? null;
  const backlog = cartoes.filter((c) => c.coluna === "Backlog");
  const pontosTotais = cartoes.reduce((s, c) => s + c.pontos, 0);
  const pontosConcluidos = concluidos.reduce((s, c) => s + c.pontos, 0);

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link href="/painel" className="w-fit text-sm text-suave transition-colors hover:text-texto">
            ← Meus projetos
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{projeto.nome}</h1>
          <p className="text-sm text-suave">
            Você é <strong className="font-medium text-texto">{NOME_DA_FUNCAO[funcao]}</strong>
            {funcao === "po" && " (gestor)"}, {membros} {membros === 1 ? "integrante" : "integrantes"}
          </p>
        </div>
        <dl className="flex divide-x divide-linha rounded-xl border border-linha bg-painel">
          {[
            ["Cartões", String(cartoes.length)],
            ["Concluídos", String(concluidos.length)],
            ["Pontos feitos", `${pontosConcluidos}/${pontosTotais}`],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="flex flex-col px-4 py-2">
              <dt className="text-xs text-suave">{rotulo}</dt>
              <dd className="text-base font-semibold tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Abas projetoId={projeto.id} atual={aba} visiveis={visiveis} />

      {aba === "board" && (
        <>
          <FaixaSprint projetoId={projeto.id} sprint={ativa} cartoes={cartoes} hoje={diaLocal(agora)} />
          {funcao === "po" && !projeto.cadastroCompleto && (
            <p className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-aviso/40 bg-aviso/10 px-4 py-3 text-sm">
              <span>Falta completar o cadastro do projeto (horas, prazo e metas). Sem ele, as métricas ficam sem referência.</span>
              <Link href={`/painel/projetos/${projeto.id}?aba=projeto`} className="font-medium text-laranja-claro hover:text-laranja">
                Completar cadastro
              </Link>
            </p>
          )}
          <Board projetoId={projeto.id} limites={limites} cartoes={cartoes} votacoes={votacoes} funcao={funcao} />
        </>
      )}

      {aba === "sprint" && (
        <div className="flex flex-col gap-6">
          {ativa ? (
            <SprintAtiva sprint={ativa} cartoes={cartoes} backlog={backlog} podeGerir={pode(funcao, "gerirSprint")} />
          ) : pode(funcao, "gerirSprint") ? (
            <NovaSprint
              projetoId={projeto.id}
              backlog={backlog}
              hoje={diaLocal(agora)}
              numero={sprints.length + 1}
              duracao={projeto.duracaoSprint ?? 14}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-linha-forte p-6 text-center text-sm text-suave">
              Nenhuma Sprint ativa. O PO ou o SM cria a próxima.
            </p>
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
      {aba === "votacao" && (
        <AbaVotacao
          projetoId={projeto.id}
          votacoes={votacoes}
          cartoes={cartoes}
          totalMembros={membros}
          meuId={usuario.id}
          limites={limites}
          podeConduzir={pode(funcao, "conduzirVotacao")}
        />
      )}
      {aba === "time" && <AbaTime projetoId={projeto.id} funcao={funcao} meuId={usuario.id} agora={agora} />}
      {aba === "projeto" && <AbaProjeto projeto={projeto} metas={metas} podeEditar={pode(funcao, "editarCadastro")} />}
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

// Os votos só são carregados na aba Votação (a função do banco esconde os votos dos outros até revelar).
async function AbaVotacao(props: {
  projetoId: string;
  votacoes: Votacao[];
  cartoes: Cartao[];
  totalMembros: number;
  meuId: string;
  limites: LimitesWip;
  podeConduzir: boolean;
}) {
  const votos = await carregarVotos(props.projetoId);
  return <Votacoes {...props} votos={votos} />;
}

async function AbaTime({ projetoId, funcao, meuId, agora }: { projetoId: string; funcao: Funcao; meuId: string; agora: string }) {
  const gerir = pode(funcao, "gerirTime");
  const [membros, convite, cabecalhos] = await Promise.all([
    carregarMembros(projetoId),
    gerir ? carregarConvite(projetoId) : Promise.resolve(null),
    headers(),
  ]);
  // Endereço do site para montar o link de convite (funciona no localhost, no Vercel e no link da Sprint).
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "shelper.vercel.app";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <Time
      projetoId={projetoId}
      membros={membros}
      convite={convite}
      podeGerir={gerir}
      meuId={meuId}
      origem={`${protocolo}://${host}`}
      agora={agora}
    />
  );
}

function CarregandoBoard() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p className="sr-only">Carregando o board…</p>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-elevado" />
      <div className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-4 overflow-hidden">
        {COLUNAS.map((c) => (
          <div key={c} className="h-72 animate-pulse rounded-xl bg-elevado" />
        ))}
      </div>
    </div>
  );
}

export default function PaginaProjeto({ params, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:py-8">
      <Suspense fallback={<CarregandoBoard />}>
        <ConteudoProjeto params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
