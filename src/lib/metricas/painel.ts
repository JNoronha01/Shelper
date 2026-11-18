import type { Metas } from "@/lib/board/dados";
import {
  classificar,
  metricasPorCartao,
  resumoDoPeriodo,
  tempoPorColuna,
  type CartaoMetrica,
  type EventoMetrica,
  type Faixa,
  type ResumoSprint,
  type TempoNaColuna,
} from "@/lib/metricas/calculo";
import { diaLocal } from "@/lib/metricas/calculo";

// Junta os cálculos puros no que a aba Métricas mostra. Continua sem acessar banco nem relógio.

export type Periodo = { inicio: string; fim: string }; // "AAAA-MM-DD", inclusive, dia de Brasília
export const PERIODO_TUDO: Periodo = { inicio: "0000-01-01", fim: "9999-12-31" };

export type PainelMetricas = {
  resumo: ResumoSprint;
  tempos: TempoNaColuna[];
  gargalo: TempoNaColuna | null;
  // Faixa só existe quando o time digitou a meta E há dado para comparar.
  faixas: { leadTime: Faixa | null; cycleTime: Faixa | null; velocity: Faixa | null };
};

export function montarPainel(
  cartoes: CartaoMetrica[],
  eventos: EventoMetrica[],
  periodo: Periodo,
  metas: Metas,
  agora: string,
): PainelMetricas {
  const porCartao = metricasPorCartao(cartoes, eventos);
  const resumo = resumoDoPeriodo(porCartao, periodo.inicio, periodo.fim);

  // Gargalo olha os concluídos do período e também o que ainda está aberto (a fila de hoje).
  const relevantes = new Set(
    porCartao
      .filter((m) => (m.concluidoEm ? diaLocal(m.concluidoEm) >= periodo.inicio && diaLocal(m.concluidoEm) <= periodo.fim : true))
      .map((m) => m.cartaoId),
  );
  const tempos = tempoPorColuna(
    eventos.filter((e) => relevantes.has(e.cartaoId)),
    agora,
  );

  const faixa = (valor: number | null, meta: number | null, menorEMelhor: boolean): Faixa | null =>
    valor === null || meta === null ? null : classificar(valor, meta, menorEMelhor);

  return {
    resumo,
    tempos,
    gargalo: tempos[0] ?? null,
    faixas: {
      leadTime: faixa(resumo.leadTimeMedioDias, metas.leadDias, true),
      cycleTime: faixa(resumo.cycleTimeMedioHoras, metas.cycleHoras, true),
      velocity: resumo.throughput > 0 ? faixa(resumo.velocity, metas.velocity, false) : null,
    },
  };
}
