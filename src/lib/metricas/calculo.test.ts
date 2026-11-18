import { describe, expect, it } from "vitest";
import type { Coluna } from "@/lib/colunas";
import {
  classificar,
  diaLocal,
  metricasPorCartao,
  resumoDoPeriodo,
  tempoPorColuna,
  type EventoMetrica,
} from "@/lib/metricas/calculo";

// Dados REAIS da Sprint 1 (histórico do Trello, horários em UTC). As contas conferidas à mão
// estão no Apêndice B.4 do Relatório: Lead médio 3,5 dias; Throughput 6; Velocity 13.
const cartoes = [
  { id: "H1", pontos: 3, criadoEm: "2026-11-10T21:09:09Z" },
  { id: "H2", pontos: 2, criadoEm: "2026-11-10T21:09:10Z" },
  { id: "H3", pontos: 3, criadoEm: "2026-11-10T21:09:10Z" },
  { id: "H4", pontos: 5, criadoEm: "2026-11-12T16:28:52Z" },
  { id: "T1", pontos: 0, criadoEm: "2026-11-12T16:46:27Z" },
  { id: "T2", pontos: 0, criadoEm: "2026-11-12T16:47:19Z" },
];

const ev = (cartaoId: string, de: Coluna | null, para: Coluna, em: string): EventoMetrica => ({ cartaoId, de, para, em });

const eventos: EventoMetrica[] = [
  // H1 foi concluído e reaberto no meio do caminho: vale o último início e a última conclusão.
  ev("H1", "A fazer", "Concluído", "2026-11-12T16:21:47Z"),
  ev("H1", "Concluído", "A fazer", "2026-11-12T22:08:29Z"),
  ev("H1", "A fazer", "Em andamento", "2026-11-13T01:37:27Z"),
  ev("H1", "Em andamento", "Concluído", "2026-11-13T02:52:10Z"),
  ev("H2", null, "A fazer", "2026-11-10T21:09:10Z"),
  ev("H3", null, "A fazer", "2026-11-10T21:09:10Z"),
  ev("H4", null, "A fazer", "2026-11-12T16:28:52Z"),
  ev("H2", "A fazer", "Em andamento", "2026-11-17T22:43:18Z"),
  ev("H2", "Em andamento", "Concluído", "2026-11-17T23:40:45Z"),
  ev("H3", "A fazer", "Em andamento", "2026-11-17T22:43:18Z"),
  ev("H3", "Em andamento", "Concluído", "2026-11-17T23:40:48Z"),
  ev("H4", "A fazer", "Em andamento", "2026-11-17T22:43:24Z"),
  ev("H4", "Em andamento", "Concluído", "2026-11-17T23:40:50Z"),
  ev("T1", "A fazer", "Em andamento", "2026-11-12T23:37:37Z"),
  ev("T1", "Em andamento", "Concluído", "2026-11-13T02:52:08Z"),
  ev("T2", "A fazer", "Em andamento", "2026-11-12T23:36:44Z"),
  ev("T2", "Em andamento", "Concluído", "2026-11-13T00:46:34Z"),
];

describe("diaLocal", () => {
  it("usa o dia de Brasília, não o de UTC", () => {
    expect(diaLocal("2026-11-13T02:52:10Z")).toBe("2026-11-12");
    expect(diaLocal("2026-11-13T03:00:00Z")).toBe("2026-11-13");
  });
});

describe("metricasPorCartao", () => {
  const m = metricasPorCartao(cartoes, eventos);
  const de = (id: string) => m.find((x) => x.cartaoId === id)!;

  it("Lead Time em dias corridos (Apêndice B.4)", () => {
    expect(["H1", "H2", "H3", "H4", "T1", "T2"].map((id) => de(id).leadTimeDias)).toEqual([2, 7, 7, 5, 0, 0]);
  });
  it("Cycle Time usa o último início", () => {
    expect(de("H1").cycleTimeHoras).toBeCloseTo(1.25, 1);
    expect(de("T1").cycleTimeHoras).toBeCloseTo(3.24, 1);
    expect(de("H2").cycleTimeHoras).toBeCloseTo(0.96, 1);
  });
  it("cartão reaberto e ainda não concluído não conta", () => {
    const so = metricasPorCartao([cartoes[0]], eventos.slice(0, 2));
    expect(so[0].concluidoEm).toBeNull();
    expect(so[0].leadTimeDias).toBeNull();
  });
});

describe("resumoDoPeriodo", () => {
  const resumo = resumoDoPeriodo(metricasPorCartao(cartoes, eventos), "2026-11-10", "2026-11-17");
  it("bate com as contas à mão do Relatório", () => {
    expect(resumo.throughput).toBe(6);
    expect(resumo.velocity).toBe(13);
    expect(resumo.leadTimeMedioDias).toBeCloseTo(3.5, 5);
    expect(resumo.cycleTimeMedioHoras).toBeCloseTo(1.42, 1);
  });
  it("ignora o que foi concluído fora do período", () => {
    expect(resumoDoPeriodo(metricasPorCartao(cartoes, eventos), "2026-11-17", "2026-11-17").throughput).toBe(3);
  });
});

describe("tempoPorColuna", () => {
  it("aponta o gargalo: a fila de A fazer", () => {
    const r = tempoPorColuna(eventos, "2026-11-18T00:00:00Z");
    expect(r[0].coluna).toBe("A fazer");
    expect(r[0].mediaHoras).toBeGreaterThan(24 * 4); // H2 e H3 esperaram ~7 dias, H4 ~5 dias
    expect(r[r.length - 1].coluna).not.toBe("A fazer");
  });
});

describe("classificar", () => {
  it("menor é melhor (Lead Time)", () => {
    expect(classificar(2, 4, true)).toBe("bom");
    expect(classificar(4.4, 4, true)).toBe("medio");
    expect(classificar(8, 4, true)).toBe("ruim");
  });
  it("maior é melhor (Velocity)", () => {
    expect(classificar(20, 13, false)).toBe("bom");
    expect(classificar(5, 13, false)).toBe("ruim");
  });
});
