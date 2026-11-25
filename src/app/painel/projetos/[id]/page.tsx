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
  carregarHistorico,
  carregarMembros,
  carregarVotos,
  type Cartao,
  type Membro,
  type Metas,
  type Sprint,
  type Votacao,
} from "@/lib/board/dados";
import type { LimitesWip } from "@/lib/board/regras";
import { eUuid } from "@/lib/board/regras";
import { COLUNAS } from "@/lib/colunas";
import { abasDoPapel, NOME_DA_FUNCAO, pode, type Funcao } from "@/lib/board/papeis";
import { diaLocal, metricasPorCartao } from "@/lib/metricas/calculo";
import {
  burndown,
  diasDoPeriodo,
  filtrarPorPessoa,
  entregasPorDia,
  fluxoAcumulado,
  porPessoa,
  temposPorCartao,
  wipPorDia,
} from "@/lib/metricas/graficos";
import { horasDoContrato } from "@/lib/board/gargalo";

const formatarNumero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
import { montarPainel, PERIODO_TUDO } from "@/lib/metricas/painel";
import { eAba, type IdAba } from "./abas";
import { ConteudoAba, ProvedorAbas } from "./navegacao-abas";
import { NomeDoProjeto, TransicaoPagina } from "@/components/transicao-pagina";
import { TituloCarregando } from "../../projeto-aberto";
import { Board } from "./board";
import { FaixaSprint } from "./faixa-sprint";
import { Historico } from "./historico";
import { Graficos, type DadosGraficos } from "./graficos";
import { Metricas } from "./metricas";
import { AbaProjeto } from "./projeto";
import { NovaSprint, SprintAnterior, SprintAtiva, SprintsEncerradas } from "./sprint";
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

  const { projeto, funcao, membros, cartoes, sprints, metas, votacoes } = dados;
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
  // Horas do contrato: as estimadas dos cartões concluídos contam como usadas.
  const horas = horasDoContrato(cartoes);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/painel"
              transitionTypes={["voltar"]}
              title="Meus projetos"
              className="-ml-1.5 rounded-lg px-1.5 py-0.5 text-lg text-suave transition-colors hover:bg-elevado hover:text-texto focus-visible:outline-2 focus-visible:outline-laranja"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">Voltar para Meus projetos</span>
            </Link>
            <NomeDoProjeto id={projeto.id}>
              <h1 className="truncate text-2xl font-semibold tracking-tight">{projeto.nome}</h1>
            </NomeDoProjeto>
          </div>
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
            ["Horas usadas", `${formatarNumero(horas.usadas)}/${projeto.horasContratadas ?? "?"} h`],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="flex flex-col px-4 py-1.5">
              <dt className="text-xs text-suave">{rotulo}</dt>
              <dd className="text-base font-semibold tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ProvedorAbas projetoId={projeto.id} atual={aba} visiveis={visiveis}>
        <ConteudoAba telaCheia={aba === "board"}>
          {aba === "board" && (
            <div className="flex flex-col gap-3 md:min-h-0 md:flex-1">
              <FaixaSprint projetoId={projeto.id} sprint={ativa} cartoes={cartoes} hoje={diaLocal(agora)} />
              {funcao === "po" && !projeto.cadastroCompleto && (
                <p className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-aviso/40 bg-aviso/10 px-4 py-3 text-sm">
                  <span>Falta completar o cadastro do projeto (horas, prazo e metas). Sem ele, as métricas ficam sem referência.</span>
                  <Link href={`/painel/projetos/${projeto.id}?aba=projeto`} className="font-medium text-laranja-claro hover:text-laranja">
                    Completar cadastro
                  </Link>
                </p>
              )}
              <Board
                projetoId={projeto.id}
                limites={limites}
                cartoes={cartoes}
                votacoes={votacoes}
                funcao={funcao}
                time={dados.time}
                agora={agora}
                meuId={usuario.id}
              />
            </div>
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
              {pode(funcao, "gerirSprint") && <SprintAnterior projetoId={projeto.id} hoje={diaLocal(agora)} />}
            </div>
          )}
          {(aba === "metricas" || aba === "minhas") && (
            <AbaMetricas
              aba={aba}
              // Dev: sempre ele mesmo. PO e SM: a pessoa do filtro, se for do time.
              pessoa={aba === "minhas" ? usuario.id : dados.time.find((m) => m.usuarioId === consulta.pessoa)?.usuarioId}
              projetoId={projeto.id}
              cartoes={cartoes}
              sprints={sprints}
              metas={metas}
              escolhida={typeof consulta.periodo === "string" ? consulta.periodo : "tudo"}
              agora={agora}
              time={dados.time}
              limites={limites}
            />
          )}
          {aba === "historico" && (
            <AbaHistorico
              projetoId={projeto.id}
              consulta={consulta}
              sprints={sprints}
              time={dados.time}
              cartoes={cartoes}
              meuId={usuario.id}
            />
          )}
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
          {aba === "projeto" && <AbaProjeto projeto={projeto} metas={metas} podeEditar={pode(funcao, "editarCadastro")} horas={horas} />}
        </ConteudoAba>
      </ProvedorAbas>
    </>
  );
}

// Só carrega todos os eventos quando a aba Métricas é aberta.
async function AbaMetricas({
  aba,
  pessoa,
  projetoId,
  cartoes: cartoesDoProjeto,
  sprints,
  metas,
  escolhida,
  agora,
  time,
  limites,
}: {
  aba: "metricas" | "minhas";
  pessoa: string | undefined;
  projetoId: string;
  cartoes: Cartao[];
  sprints: Sprint[];
  metas: Metas;
  escolhida: string;
  agora: string;
  time: Membro[];
  limites: LimitesWip;
}) {
  const eventosDoProjeto = await carregarEventosParaCalculo(projetoId);
  const { cartoes, eventos } = pessoa
    ? filtrarPorPessoa(cartoesDoProjeto, eventosDoProjeto, pessoa)
    : { cartoes: cartoesDoProjeto, eventos: eventosDoProjeto };
  const quem = pessoa ? (time.find((m) => m.usuarioId === pessoa) ?? null) : null;
  const sprint = sprints.find((s) => s.id === escolhida);
  const periodo = sprint ? { inicio: sprint.inicio, fim: sprint.fim } : PERIODO_TUDO;
  const painel = montarPainel(cartoes, eventos, periodo, metas, agora);

  // Séries dos gráficos: os dias da Sprint escolhida, ou os últimos 45 dias do projeto.
  const hoje = diaLocal(agora);
  const primeiro = eventos.length ? eventos.reduce((m, e) => (e.em < m ? e.em : m), eventos[0].em) : agora;
  const inicio45 = new Date(`${hoje}T00:00:00Z`);
  inicio45.setUTCDate(inicio45.getUTCDate() - 44);
  const dias = sprint
    ? diasDoPeriodo(sprint.inicio, sprint.fim)
    : diasDoPeriodo([diaLocal(primeiro), inicio45.toISOString().slice(0, 10)].sort()[1], hoje);
  const inicioDias = dias[0] ?? hoje;
  const fimDias = dias[dias.length - 1] ?? hoje;
  const metricas = metricasPorCartao(cartoes, eventos);
  const fluxo = fluxoAcumulado(eventos, dias);
  const dados: DadosGraficos = {
    sprintEscolhida: Boolean(sprint),
    individual: Boolean(pessoa),
    fluxo,
    wip: wipPorDia(fluxo),
    limites: { andamento: limites.wipAndamento, revisao: limites.wipRevisao },
    burndown: sprint
      ? burndown(
          cartoes.filter((c) => c.sprintId === sprint.id),
          eventos,
          dias,
          hoje,
        )
      : null,
    entregas: entregasPorDia(metricas, dias),
    tempos: temposPorCartao(metricas, new Map(cartoes.map((c) => [c.id, c.titulo])), inicioDias, fimDias),
    metas: { leadDias: metas.leadDias, cycleHoras: metas.cycleHoras },
    pessoas: porPessoa(cartoes, metricas, time, inicioDias, fimDias),
  };

  return (
    <>
      <Metricas
        projetoId={projetoId}
        painel={painel}
        metas={metas}
        sprints={sprints}
        escolhida={sprint ? sprint.id : "tudo"}
        aba={aba}
        pessoa={quem ? { id: quem.usuarioId, nome: quem.nome } : pessoa ? { id: pessoa, nome: "você" } : null}
        time={time}
      />
      <Graficos dados={dados} />
    </>
  );
}

// Histórico paginado e filtrado no banco; os filtros vêm do endereço da página.
async function AbaHistorico({
  projetoId,
  consulta,
  sprints,
  time,
  cartoes,
  meuId,
}: {
  projetoId: string;
  consulta: Record<string, string | string[] | undefined>;
  sprints: Sprint[];
  time: Membro[];
  cartoes: Cartao[];
  meuId: string;
}) {
  const texto = (k: string) => (typeof consulta[k] === "string" ? (consulta[k] as string) : undefined);
  const sprint = sprints.find((s) => s.id === texto("sprint"));
  const pessoa = time.find((m) => m.usuarioId === texto("pessoa"))?.usuarioId;
  const cartao = cartoes.find((c) => c.id === texto("cartao"))?.id;
  const acima = texto("wip") === "acima";
  const pagina = Math.max(1, Math.min(10_000, Number.parseInt(texto("pagina") ?? "1", 10) || 1));
  const { itens, total } = await carregarHistorico(
    projetoId,
    { sprint: sprint ? { inicio: sprint.inicio, fim: sprint.fim } : undefined, pessoa, cartao, acimaDoWip: acima },
    pagina,
  );
  return (
    <Historico
      projetoId={projetoId}
      itens={itens}
      total={total}
      pagina={pagina}
      filtros={{ sprint: sprint?.id, pessoa, cartao, wip: acima ? "acima" : undefined }}
      sprints={sprints}
      time={time}
      cartoes={cartoes}
      meuId={meuId}
    />
  );
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

// Esqueleto no formato da página: título (já com o nome do projeto clicado), números, abas e colunas.
function CarregandoBoard() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <p className="sr-only">Carregando o board…</p>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <TituloCarregando />
          <div className="esqueleto h-4 w-48 rounded-md" />
        </div>
        <div className="esqueleto h-12 w-96 max-w-full rounded-xl" />
      </div>
      <div className="esqueleto h-10 w-[36rem] max-w-full rounded-xl" />
      <div className="grid grid-flow-col auto-cols-[17.5rem] gap-3 overflow-hidden xl:auto-cols-fr">
        {COLUNAS.map((c) => (
          <div key={c} className="esqueleto h-[60vh] rounded-coluna" />
        ))}
      </div>
    </div>
  );
}

export default function PaginaProjeto({ params, searchParams }: Props) {
  return (
    <TransicaoPagina>
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5 md:has-[[data-tela-cheia]]:h-[calc(100dvh-3.5rem)] md:has-[[data-tela-cheia]]:flex-none md:has-[[data-tela-cheia]]:overflow-hidden md:has-[[data-tela-cheia]]:py-4">
        {/* Na aba Board (telas médias para cima) a página não rola: tudo cabe na tela e só as colunas rolam. */}
        <Suspense fallback={<CarregandoBoard />}>
          <ConteudoProjeto params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </TransicaoPagina>
  );
}
