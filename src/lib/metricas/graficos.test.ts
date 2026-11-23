import { describe, expect, it } from "vitest";
import { metricasPorCartao, type EventoMetrica } from "./calculo";
import {
  burndown,
  diasDoPeriodo,
  entregasPorDia,
  fluxoAcumulado,
  filtrarPorPessoa,
  porPessoa,
  temposPorCartao,
  wipPorDia,
} from "./graficos";

// Dois cartões: A anda pelo fluxo todo; B fica em Em andamento.
// Horários em UTC; 15:00Z = 12:00 em Brasília (mesmo dia).
const eventos: EventoMetrica[] = [
  { cartaoId: "A", de: null, para: "Backlog", em: "2026-11-20T15:00:00Z" },
  { cartaoId: "B", de: null, para: "Backlog", em: "2026-11-20T15:00:00Z" },
  { cartaoId: "A", de: "Backlog", para: "Em andamento", em: "2026-11-21T15:00:00Z" },
  { cartaoId: "B", de: "Backlog", para: "Em andamento", em: "2026-11-22T15:00:00Z" },
  { cartaoId: "A", de: "Em andamento", para: "Concluído", em: "2026-11-22T18:00:00Z" },
];
const dias = diasDoPeriodo("2026-11-20", "2026-11-23");

describe("séries dos gráficos", () => {
  it("lista os dias do período, inclusive", () => {
    expect(dias).toEqual(["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"]);
    expect(diasDoPeriodo("2026-01-01", "2026-12-31", 10)).toHaveLength(10);
  });
  it("fluxo acumulado conta cada cartão na coluna em que estava no fim do dia", () => {
    const f = fluxoAcumulado(eventos, dias);
    expect(f[0]).toMatchObject({ Backlog: 2, "Em andamento": 0, Concluído: 0 });
    expect(f[1]).toMatchObject({ Backlog: 1, "Em andamento": 1 });
    expect(f[2]).toMatchObject({ Backlog: 0, "Em andamento": 1, Concluído: 1 });
    expect(wipPorDia(f)[2]).toEqual({ dia: "2026-11-22", andamento: 1, revisao: 0 });
  });
  it("burndown desce quando o cartão chega em Concluído e deixa os dias futuros vazios", () => {
    const b = burndown(
      [
        { id: "A", pontos: 5 },
        { id: "B", pontos: 3 },
      ],
      eventos,
      dias,
      "2026-11-22",
    );
    expect(b.map((p) => p.restante)).toEqual([8, 8, 3, null]);
    expect(b[0].ideal).toBe(8);
    expect(b[3].ideal).toBe(0);
  });
  const metricas = metricasPorCartao(
    [
      { id: "A", pontos: 5, criadoEm: "2026-11-20T15:00:00Z" },
      { id: "B", pontos: 3, criadoEm: "2026-11-20T15:00:00Z" },
    ],
    eventos,
  );
  it("throughput e velocity por dia", () => {
    expect(entregasPorDia(metricas, dias).map((p) => [p.cartoes, p.pontos])).toEqual([
      [0, 0],
      [0, 0],
      [1, 5],
      [0, 0],
    ]);
  });
  it("lead e cycle de cada cartão concluído no período", () => {
    expect(temposPorCartao(metricas, new Map([["A", "Login"]]), "2026-11-20", "2026-11-23")).toEqual([
      { titulo: "Login", leadDias: 2, cycleHoras: 27, dia: "2026-11-22" },
    ]);
  });
  it("por pessoa: concluídos no período e horas estimadas x usadas", () => {
    const linhas = porPessoa(
      [
        { id: "A", responsavelId: "u1", horasEstimadas: 8, coluna: "Concluído" },
        { id: "B", responsavelId: "u1", horasEstimadas: 4, coluna: "Em andamento" },
      ],
      metricas,
      [
        { usuarioId: "u1", nome: "Giovanni" },
        { usuarioId: "u2", nome: "Andryws" },
      ],
      "2026-11-20",
      "2026-11-23",
    );
    expect(linhas).toEqual([
      { nome: "Giovanni", cartoes: 1, pontos: 5, horasEstimadas: 12, horasUsadas: 8 },
      { nome: "Andryws", cartoes: 0, pontos: 0, horasEstimadas: 0, horasUsadas: 0 },
    ]);
  });
});

describe("métricas por pessoa", () => {
  it("fica só com os cartões da pessoa e os eventos deles", () => {
    const cartoes = [
      { id: "a", responsavelId: "ana" },
      { id: "b", responsavelId: "bia" },
      { id: "c", responsavelId: null },
    ];
    const eventos: EventoMetrica[] = [
      { cartaoId: "a", de: null, para: "Backlog", em: "2026-11-01T12:00:00Z" },
      { cartaoId: "b", de: null, para: "Backlog", em: "2026-11-01T12:00:00Z" },
      { cartaoId: "a", de: "Backlog", para: "Em andamento", em: "2026-11-02T12:00:00Z" },
    ];
    const r = filtrarPorPessoa(cartoes, eventos, "ana");
    expect(r.cartoes.map((c) => c.id)).toEqual(["a"]);
    expect(r.eventos).toHaveLength(2);
    expect(filtrarPorPessoa(cartoes, eventos, "ninguem").cartoes).toEqual([]);
  });
});
