import { COLUNAS, type Coluna } from "@/lib/colunas";
import { diaLocal, metricasPorCartao } from "@/lib/metricas/calculo";
import { burndown, diasDoPeriodo, porPessoa } from "@/lib/metricas/graficos";
import { montarPainel, PERIODO_TUDO } from "@/lib/metricas/painel";

// O que a API devolve, montado a partir do pacote que o banco entrega (função api_dados).
// Funções puras: recebem os dados e o "agora", devolvem objetos prontos para virar JSON.
// Os nomes dos campos ficam em português, como no resto do Shelper.

export type DadosApi = {
  eu: { id: string; nome: string | null; funcao: "po" | "sm" | "dev" };
  projeto: {
    id: string;
    nome: string;
    wip_andamento: number;
    wip_revisao: number;
    meta_lead_dias: number | null;
    meta_cycle_horas: number | null;
    meta_velocity: number | null;
    cliente: string | null;
    objetivo: string | null;
    data_inicio: string | null;
    data_entrega: string | null;
  };
  sprints: { id: string; numero: number; inicio: string; fim: string; meta: string | null; encerrada: boolean }[];
  time: { id: string; nome: string; funcao: "po" | "sm" | "dev" }[];
  cartoes: {
    id: string;
    titulo: string;
    pontos: number;
    coluna: Coluna;
    criado_em: string;
    sprint_id: string | null;
    descricao: string | null;
    responsavel_id: string | null;
    horas_estimadas: number | null;
    bloqueado: boolean;
    motivo_bloqueio: string | null;
    checklist: { id: string; texto: string; feito: boolean }[];
  }[];
  eventos: { cartao_id: string; de: Coluna | null; para: Coluna; em: string }[];
};

const FUNCAO = { po: "Product Owner", sm: "Scrum Master", dev: "Desenvolvedor" } as const;

const eventosCalculo = (d: DadosApi) => d.eventos.map((e) => ({ cartaoId: e.cartao_id, de: e.de, para: e.para, em: e.em }));
const cartoesCalculo = (d: DadosApi) => d.cartoes.map((c) => ({ id: c.id, pontos: c.pontos, criadoEm: c.criado_em }));

// Sprint ativa = a que não foi encerrada (o Shelper só deixa uma por vez).
export function sprintAtiva(d: DadosApi) {
  return d.sprints.find((s) => !s.encerrada) ?? null;
}

// "ativa", "2" ou o id. Devolve null quando não acha.
export function acharSprint(d: DadosApi, ref: string | undefined | null) {
  if (!ref) return null;
  if (ref === "ativa") return sprintAtiva(d);
  const numero = Number(ref);
  return d.sprints.find((s) => s.id === ref || (Number.isInteger(numero) && s.numero === numero)) ?? null;
}

export function verCartao(d: DadosApi, c: DadosApi["cartoes"][number]) {
  const pessoa = new Map(d.time.map((t) => [t.id, t.nome]));
  const sprint = new Map(d.sprints.map((s) => [s.id, s.numero]));
  return {
    id: c.id,
    titulo: c.titulo,
    pontos: c.pontos,
    coluna: c.coluna,
    sprint: c.sprint_id ? (sprint.get(c.sprint_id) ?? null) : null,
    responsavel: c.responsavel_id ? { id: c.responsavel_id, nome: pessoa.get(c.responsavel_id) ?? null } : null,
    horas_estimadas: c.horas_estimadas,
    bloqueado: c.bloqueado,
    motivo_bloqueio: c.motivo_bloqueio,
    descricao: c.descricao,
    criado_em: c.criado_em,
    checklist: c.checklist,
  };
}

export function resumoDoProjeto(d: DadosApi) {
  const ativa = sprintAtiva(d);
  const porColuna = Object.fromEntries(
    COLUNAS.map((col) => {
      const da = d.cartoes.filter((c) => c.coluna === col);
      return [col, { cartoes: da.length, pontos: da.reduce((s, c) => s + c.pontos, 0) }];
    }),
  );
  return {
    projeto: {
      id: d.projeto.id,
      nome: d.projeto.nome,
      cliente: d.projeto.cliente,
      objetivo: d.projeto.objetivo,
      data_inicio: d.projeto.data_inicio,
      data_entrega: d.projeto.data_entrega,
    },
    voce: { id: d.eu.id, nome: d.eu.nome, papel: FUNCAO[d.eu.funcao] },
    limites_wip: { "Em andamento": d.projeto.wip_andamento, "Em revisão": d.projeto.wip_revisao },
    metas: { lead_time_dias: d.projeto.meta_lead_dias, cycle_time_horas: d.projeto.meta_cycle_horas, velocity: d.projeto.meta_velocity },
    colunas: porColuna,
    sprint_ativa: ativa ? { numero: ativa.numero, inicio: ativa.inicio, fim: ativa.fim, meta: ativa.meta } : null,
    sprints: d.sprints.map((s) => ({ numero: s.numero, inicio: s.inicio, fim: s.fim, meta: s.meta, encerrada: s.encerrada })),
    time: d.time.map((t) => ({ id: t.id, nome: t.nome, papel: FUNCAO[t.funcao] })),
    bloqueados: d.cartoes.filter((c) => c.bloqueado).map((c) => ({ id: c.id, titulo: c.titulo, motivo: c.motivo_bloqueio })),
  };
}

export type FiltroCartoes = { coluna?: string | null; sprint?: string | null; responsavel?: string | null; busca?: string | null };

export function listarCartoes(d: DadosApi, f: FiltroCartoes) {
  const sprint = f.sprint ? acharSprint(d, f.sprint) : null;
  if (f.sprint && f.sprint !== "nenhuma" && !sprint) throw new ErroApi(400, `Sprint "${f.sprint}" não encontrada.`);
  if (f.coluna && !(COLUNAS as readonly string[]).includes(f.coluna)) {
    throw new ErroApi(400, `Coluna inválida. Use uma destas: ${COLUNAS.join(", ")}.`);
  }
  const busca = f.busca?.trim().toLowerCase();
  const resp = f.responsavel?.trim().toLowerCase();
  const pessoa = new Map(d.time.map((t) => [t.id, t.nome.toLowerCase()]));
  return d.cartoes
    .filter((c) => !f.coluna || c.coluna === f.coluna)
    .filter((c) => !f.sprint || (f.sprint === "nenhuma" ? c.sprint_id === null : c.sprint_id === sprint?.id))
    .filter((c) => !resp || c.responsavel_id === resp || (c.responsavel_id !== null && (pessoa.get(c.responsavel_id) ?? "").includes(resp)))
    .filter((c) => !busca || c.titulo.toLowerCase().includes(busca) || (c.descricao ?? "").toLowerCase().includes(busca))
    .map((c) => verCartao(d, c));
}

export function metricasDoProjeto(d: DadosApi, sprintRef: string | null | undefined, agora: string) {
  const sprint = sprintRef ? acharSprint(d, sprintRef) : null;
  if (sprintRef && !sprint) throw new ErroApi(400, `Sprint "${sprintRef}" não encontrada.`);
  const eventos = eventosCalculo(d);
  const cartoes = cartoesCalculo(d);
  const periodo = sprint ? { inicio: sprint.inicio, fim: sprint.fim } : PERIODO_TUDO;
  const metas = { leadDias: d.projeto.meta_lead_dias, cycleHoras: d.projeto.meta_cycle_horas, velocity: d.projeto.meta_velocity };
  const painel = montarPainel(cartoes, eventos, periodo, metas, agora);
  const metricas = metricasPorCartao(cartoes, eventos);
  const daSprint = sprint ? d.cartoes.filter((c) => c.sprint_id === sprint.id) : [];
  const arred = (n: number | null, casas = 1) => (n === null ? null : Math.round(n * 10 ** casas) / 10 ** casas);
  return {
    periodo: sprint ? `Sprint ${sprint.numero} (${sprint.inicio} a ${sprint.fim})` : "Projeto todo",
    lead_time_medio_dias: arred(painel.resumo.leadTimeMedioDias),
    cycle_time_medio_horas: arred(painel.resumo.cycleTimeMedioHoras),
    throughput: painel.resumo.throughput,
    velocity: painel.resumo.velocity,
    faixas: painel.faixas,
    gargalo: painel.gargalo ? { coluna: painel.gargalo.coluna, media_horas: arred(painel.gargalo.mediaHoras) } : null,
    tempo_medio_por_coluna_horas: Object.fromEntries(painel.tempos.map((t) => [t.coluna, arred(t.mediaHoras)])),
    ...(sprint
      ? {
          sprint: {
            numero: sprint.numero,
            meta: sprint.meta,
            pontos_planejados: daSprint.reduce((s, c) => s + c.pontos, 0),
            pontos_concluidos: daSprint.filter((c) => c.coluna === "Concluído").reduce((s, c) => s + c.pontos, 0),
            burndown: burndown(daSprint, eventos, diasDoPeriodo(sprint.inicio, sprint.fim), diaLocal(agora)).map((p) => ({
              dia: p.dia,
              faltam: p.restante,
              ideal: p.ideal,
            })),
            por_pessoa: porPessoa(
              daSprint.map((c) => ({ id: c.id, responsavelId: c.responsavel_id, horasEstimadas: c.horas_estimadas, coluna: c.coluna })),
              metricas,
              d.time.map((t) => ({ usuarioId: t.id, nome: t.nome })),
              sprint.inicio,
              sprint.fim,
            ),
          },
        }
      : {}),
  };
}

// Erro com status HTTP e mensagem pronta para quem chamou.
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}
