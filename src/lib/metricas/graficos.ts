import { COLUNAS, type Coluna } from "@/lib/colunas";
import { diaLocal, type EventoMetrica, type MetricaCartao } from "./calculo";

// Séries dos gráficos da aba Métricas (pedido do professor: "dash BI" em vez de só números).
// Funções puras, como em calculo.ts: recebem os eventos e devolvem os pontos de cada dia.
// Dia = dia do calendário no fuso de Brasília, formato "AAAA-MM-DD".

const MS_DIA = 86_400_000;
const paraUtc = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const deUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Lista de dias entre início e fim (inclusive). Limita a 120 dias para o gráfico continuar legível.
export function diasDoPeriodo(inicio: string, fim: string, limite = 120): string[] {
  const dias: string[] = [];
  for (let t = paraUtc(inicio); t <= paraUtc(fim) && dias.length < limite; t += MS_DIA) dias.push(deUtc(t));
  return dias;
}

// Coluna de cada cartão no fim de cada dia: último evento até aquele dia.
function colunaNoFimDoDia(eventosDoCartao: EventoMetrica[], dia: string): Coluna | null {
  let coluna: Coluna | null = null;
  for (const e of eventosDoCartao) {
    if (diaLocal(e.em) > dia) break;
    coluna = e.para;
  }
  return coluna;
}

function agruparPorCartao(eventos: EventoMetrica[]) {
  const mapa = new Map<string, EventoMetrica[]>();
  for (const e of [...eventos].sort((a, b) => Date.parse(a.em) - Date.parse(b.em))) {
    const lista = mapa.get(e.cartaoId) ?? [];
    lista.push(e);
    mapa.set(e.cartaoId, lista);
  }
  return mapa;
}

export type PontoFluxo = { dia: string } & Record<Coluna, number>;

// Fluxo acumulado (CFD): quantos cartões havia em cada coluna no fim de cada dia.
export function fluxoAcumulado(eventos: EventoMetrica[], dias: string[]): PontoFluxo[] {
  const porCartao = agruparPorCartao(eventos);
  return dias.map((dia) => {
    const ponto = { dia, ...Object.fromEntries(COLUNAS.map((c) => [c, 0])) } as PontoFluxo;
    for (const lista of porCartao.values()) {
      const coluna = colunaNoFimDoDia(lista, dia);
      if (coluna) ponto[coluna] += 1;
    }
    return ponto;
  });
}

export type PontoWip = { dia: string; andamento: number; revisao: number };

// WIP por dia: cartões em Em andamento e em Em revisão no fim de cada dia.
export function wipPorDia(fluxo: PontoFluxo[]): PontoWip[] {
  return fluxo.map((p) => ({ dia: p.dia, andamento: p["Em andamento"], revisao: p["Em revisão"] }));
}

export type PontoBurndown = { dia: string; restante: number | null; ideal: number };

// Burndown da Sprint: pontos dos cartões da Sprint que ainda não estavam em Concluído no fim
// de cada dia, contra a linha ideal (do total até zero no último dia). Dias futuros ficam vazios.
export function burndown(
  cartoesDaSprint: { id: string; pontos: number }[],
  eventos: EventoMetrica[],
  dias: string[],
  hoje: string,
): PontoBurndown[] {
  const porCartao = agruparPorCartao(eventos.filter((e) => cartoesDaSprint.some((c) => c.id === e.cartaoId)));
  const total = cartoesDaSprint.reduce((s, c) => s + c.pontos, 0);
  const passos = Math.max(1, dias.length - 1);
  return dias.map((dia, i) => ({
    dia,
    ideal: Math.round((total - (total * i) / passos) * 10) / 10,
    restante:
      dia > hoje
        ? null
        : cartoesDaSprint.reduce((s, c) => (colunaNoFimDoDia(porCartao.get(c.id) ?? [], dia) === "Concluído" ? s : s + c.pontos), 0),
  }));
}

export type PontoEntrega = { dia: string; cartoes: number; pontos: number };

// Throughput (cartões) e Velocity (pontos) concluídos em cada dia.
export function entregasPorDia(metricas: MetricaCartao[], dias: string[]): PontoEntrega[] {
  return dias.map((dia) => {
    const doDia = metricas.filter((m) => m.concluidoEm && diaLocal(m.concluidoEm) === dia);
    return { dia, cartoes: doDia.length, pontos: doDia.reduce((s, m) => s + m.pontos, 0) };
  });
}

export type PontoCartao = { titulo: string; leadDias: number | null; cycleHoras: number | null; dia: string };

// Lead Time e Cycle Time de cada cartão concluído no período, em ordem de conclusão.
export function temposPorCartao(metricas: MetricaCartao[], titulos: Map<string, string>, inicio: string, fim: string): PontoCartao[] {
  return metricas
    .filter((m) => m.concluidoEm && diaLocal(m.concluidoEm) >= inicio && diaLocal(m.concluidoEm) <= fim)
    .sort((a, b) => Date.parse(a.concluidoEm!) - Date.parse(b.concluidoEm!))
    .map((m) => ({
      titulo: titulos.get(m.cartaoId) ?? "Cartão",
      leadDias: m.leadTimeDias,
      cycleHoras: m.cycleTimeHoras === null ? null : Math.round(m.cycleTimeHoras * 10) / 10,
      dia: diaLocal(m.concluidoEm!),
    }));
}

export type PontoPessoa = { nome: string; cartoes: number; pontos: number; horasEstimadas: number; horasUsadas: number };

// Por pessoa (responsável do cartão): concluídos no período e horas estimadas x usadas.
// Horas usadas = estimadas dos cartões concluídos (mesma regra das horas do contrato).
export function porPessoa(
  cartoes: { id: string; responsavelId: string | null; horasEstimadas: number | null; coluna: Coluna }[],
  metricas: MetricaCartao[],
  time: { usuarioId: string; nome: string }[],
  inicio: string,
  fim: string,
): PontoPessoa[] {
  const concluidoNoPeriodo = new Map(
    metricas.filter((m) => m.concluidoEm && diaLocal(m.concluidoEm) >= inicio && diaLocal(m.concluidoEm) <= fim).map((m) => [m.cartaoId, m]),
  );
  const linhas = [...time, { usuarioId: "", nome: "Sem responsável" }].map((p) => {
    const dele = cartoes.filter((c) => (c.responsavelId ?? "") === p.usuarioId);
    const feitos = dele.filter((c) => concluidoNoPeriodo.has(c.id));
    return {
      nome: p.nome,
      cartoes: feitos.length,
      pontos: feitos.reduce((s, c) => s + (concluidoNoPeriodo.get(c.id)?.pontos ?? 0), 0),
      horasEstimadas: dele.reduce((s, c) => s + (c.horasEstimadas ?? 0), 0),
      horasUsadas: dele.filter((c) => c.coluna === "Concluído").reduce((s, c) => s + (c.horasEstimadas ?? 0), 0),
    };
  });
  // "Sem responsável" só aparece se tiver algo.
  return linhas.filter((l) => l.nome !== "Sem responsável" || l.cartoes > 0 || l.horasEstimadas > 0);
}
