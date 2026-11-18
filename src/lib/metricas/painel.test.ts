import { describe, expect, it } from "vitest";
import { montarPainel, PERIODO_TUDO } from "@/lib/metricas/painel";

const cartoes = [
  { id: "A", pontos: 3, criadoEm: "2026-11-10T12:00:00Z" },
  { id: "B", pontos: 5, criadoEm: "2026-11-10T12:00:00Z" },
];
const eventos = [
  { cartaoId: "A", de: null, para: "A fazer" as const, em: "2026-11-10T12:00:00Z" },
  { cartaoId: "A", de: "A fazer" as const, para: "Em andamento" as const, em: "2026-11-12T12:00:00Z" },
  { cartaoId: "A", de: "Em andamento" as const, para: "Concluído" as const, em: "2026-11-12T14:00:00Z" },
  // B continua aberto em "A fazer": entra no gargalo, não no Throughput.
  { cartaoId: "B", de: null, para: "A fazer" as const, em: "2026-11-10T12:00:00Z" },
];

describe("montarPainel", () => {
  const sem = { leadDias: null, cycleHoras: null, velocity: null };

  it("calcula resumo, gargalo e não inventa faixa sem meta", () => {
    const p = montarPainel(cartoes, eventos, PERIODO_TUDO, sem, "2026-11-14T12:00:00Z");
    expect(p.resumo).toMatchObject({ throughput: 1, velocity: 3, leadTimeMedioDias: 2 });
    expect(p.resumo.cycleTimeMedioHoras).toBeCloseTo(2, 5);
    expect(p.gargalo?.coluna).toBe("A fazer");
    expect(p.faixas).toEqual({ leadTime: null, cycleTime: null, velocity: null });
  });

  it("classifica quando o time digita a meta", () => {
    const p = montarPainel(cartoes, eventos, PERIODO_TUDO, { leadDias: 5, cycleHoras: 1, velocity: 3 }, "2026-11-14T12:00:00Z");
    expect(p.faixas).toEqual({ leadTime: "bom", cycleTime: "ruim", velocity: "medio" });
  });
});
