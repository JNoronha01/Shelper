import type { Coluna } from "@/lib/colunas";

// Cálculo das métricas do Shelper a partir dos EVENTOS de movimentação.
// Tudo aqui é função pura: recebe dados, devolve números, não acessa banco nem relógio.
// Por quê: função pura é fácil de testar com os números conferidos à mão
// (Apêndice B.4 do Relatório) e pode ser usada por qualquer tela depois.
// Regras de data: Apêndice B.3 do Relatório.

export type CartaoMetrica = { id: string; pontos: number; criadoEm: string };
export type EventoMetrica = { cartaoId: string; de: Coluna | null; para: Coluna; em: string };

export type MetricaCartao = {
  cartaoId: string;
  pontos: number;
  concluidoEm: string | null; // data do último movimento para "Concluído" (null se não está concluído)
  leadTimeDias: number | null; // dias corridos: conclusão − criação
  cycleTimeHoras: number | null; // horas: conclusão − último início em "Em andamento"
};

const FUSO = "America/Sao_Paulo";
const MS_HORA = 3_600_000;

// "2026-11-13T02:52:10Z" -> "2026-11-12": o dia do calendário no fuso de Brasília.
// Por quê: o servidor guarda em UTC, mas o time conta o dia em horário de Brasília.
export function diaLocal(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

function diasEntre(inicioIso: string, fimIso: string): number {
  const [a, b] = [diaLocal(inicioIso), diaLocal(fimIso)].map((d) => {
    const [ano, mes, dia] = d.split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia);
  });
  return Math.round((b - a) / 86_400_000);
}

const porHorario = (a: EventoMetrica, b: EventoMetrica) => new Date(a.em).getTime() - new Date(b.em).getTime();

// Métricas de cada cartão. Só vale como "concluído" o cartão cujo ÚLTIMO movimento foi para
// "Concluído": se ele foi reaberto depois, o histórico continua nos eventos, mas ele não conta.
export function metricasPorCartao(cartoes: CartaoMetrica[], eventos: EventoMetrica[]): MetricaCartao[] {
  return cartoes.map((c) => {
    const meus = eventos.filter((e) => e.cartaoId === c.id).sort(porHorario);
    const ultimo = meus[meus.length - 1];
    if (!ultimo || ultimo.para !== "Concluído") {
      return { cartaoId: c.id, pontos: c.pontos, concluidoEm: null, leadTimeDias: null, cycleTimeHoras: null };
    }
    const concluidoEm = ultimo.em;
    // Último início de trabalho antes da conclusão.
    const inicio = [...meus].reverse().find((e) => e.para === "Em andamento");
    return {
      cartaoId: c.id,
      pontos: c.pontos,
      concluidoEm,
      leadTimeDias: diasEntre(c.criadoEm, concluidoEm),
      cycleTimeHoras: inicio ? (new Date(concluidoEm).getTime() - new Date(inicio.em).getTime()) / MS_HORA : null,
    };
  });
}

const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null);

export type ResumoSprint = {
  throughput: number; // cartões concluídos no período
  velocity: number; // soma dos pontos dos concluídos
  leadTimeMedioDias: number | null;
  cycleTimeMedioHoras: number | null;
};

// Período = dias do calendário (inclusive) no fuso de Brasília, formato "AAAA-MM-DD".
export function resumoDoPeriodo(metricas: MetricaCartao[], inicio: string, fim: string): ResumoSprint {
  const concluidos = metricas.filter((m) => {
    if (!m.concluidoEm) return false;
    const dia = diaLocal(m.concluidoEm);
    return dia >= inicio && dia <= fim;
  });
  return {
    throughput: concluidos.length,
    velocity: concluidos.reduce((s, m) => s + m.pontos, 0),
    leadTimeMedioDias: media(concluidos.flatMap((m) => (m.leadTimeDias === null ? [] : [m.leadTimeDias]))),
    cycleTimeMedioHoras: media(concluidos.flatMap((m) => (m.cycleTimeHoras === null ? [] : [m.cycleTimeHoras]))),
  };
}

export type TempoNaColuna = { coluna: Coluna; mediaHoras: number; cartoes: number };

// Gargalo: coluna onde os cartões ficam mais tempo, em média. Considera só as colunas de fluxo
// (da fila até a revisão); Backlog e Concluído não são etapas de trabalho.
// "agora" entra como parâmetro (e não new Date() aqui dentro) para a função continuar pura.
const COLUNAS_DE_FLUXO: Coluna[] = ["A fazer", "Em andamento", "Em revisão"];

export function tempoPorColuna(eventos: EventoMetrica[], agora: string): TempoNaColuna[] {
  const horas = new Map<Coluna, number>();
  const cartoesPorColuna = new Map<Coluna, Set<string>>();
  const ids = [...new Set(eventos.map((e) => e.cartaoId))];
  for (const id of ids) {
    const meus = eventos.filter((e) => e.cartaoId === id).sort(porHorario);
    meus.forEach((e, i) => {
      if (!COLUNAS_DE_FLUXO.includes(e.para)) return;
      const saida = meus[i + 1]?.em ?? agora; // ficou na coluna até o próximo movimento
      const h = (new Date(saida).getTime() - new Date(e.em).getTime()) / MS_HORA;
      horas.set(e.para, (horas.get(e.para) ?? 0) + h);
      cartoesPorColuna.set(e.para, (cartoesPorColuna.get(e.para) ?? new Set()).add(id));
    });
  }
  return COLUNAS_DE_FLUXO.filter((c) => horas.has(c))
    .map((coluna) => {
      const n = cartoesPorColuna.get(coluna)!.size;
      return { coluna, mediaHoras: horas.get(coluna)! / n, cartoes: n };
    })
    .sort((a, b) => b.mediaHoras - a.mediaHoras);
}

export type Faixa = "bom" | "medio" | "ruim";

// Leitura "bom / mais ou menos / ruim": compara o valor com uma referência (a média do time
// ou uma meta). Tolerância de 20%: dentro dela é "medio". Parâmetro menorEMelhor porque
// Lead Time baixo é bom, mas Velocity baixa não é.
export function classificar(valor: number, referencia: number, menorEMelhor: boolean, tolerancia = 0.2): Faixa {
  if (referencia === 0) return "medio";
  const razao = valor / referencia;
  const melhor = menorEMelhor ? razao < 1 - tolerancia : razao > 1 + tolerancia;
  const pior = menorEMelhor ? razao > 1 + tolerancia : razao < 1 - tolerancia;
  return melhor ? "bom" : pior ? "ruim" : "medio";
}
