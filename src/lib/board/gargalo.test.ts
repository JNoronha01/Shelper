import { describe, expect, it } from "vitest";
import { alertasDoBoard, formatarDuracao, horasDoContrato, prazoDoCartao, type CartaoComPrazo } from "./gargalo";

const base: CartaoComPrazo = {
  id: "a",
  coluna: "Em andamento",
  horasEstimadas: 4,
  inicioAndamento: "2026-11-24T12:00:00Z",
  bloqueado: false,
  bloqueadoEm: null,
};

describe("gargalo pelo tempo estimado", () => {
  it("conta desde a entrada em Em andamento e marca atrasado quando passa do estimado", () => {
    expect(prazoDoCartao(base, "2026-11-24T15:00:00Z")).toEqual({ decorridoHoras: 3, estimadoHoras: 4, atrasado: false, porcentagem: 75 });
    expect(prazoDoCartao(base, "2026-11-24T18:00:00Z")).toMatchObject({ decorridoHoras: 6, atrasado: true, porcentagem: 150 });
  });
  it("continua contando em Em revisão, mas não em A fazer nem em Concluído", () => {
    expect(prazoDoCartao({ ...base, coluna: "Em revisão" }, "2026-11-24T18:00:00Z")?.atrasado).toBe(true);
    expect(prazoDoCartao({ ...base, coluna: "A fazer" }, "2026-11-24T18:00:00Z")).toBeNull();
    expect(prazoDoCartao({ ...base, coluna: "Concluído" }, "2026-11-24T18:00:00Z")).toBeNull();
  });
  it("sem estimativa ou sem ter começado, não há prazo", () => {
    expect(prazoDoCartao({ ...base, horasEstimadas: null }, "2026-11-24T18:00:00Z")).toBeNull();
    expect(prazoDoCartao({ ...base, inicioAndamento: null }, "2026-11-24T18:00:00Z")).toBeNull();
  });
  it("o painel Atenção lista atrasados (mais estourado primeiro) e bloqueados", () => {
    const cartoes: CartaoComPrazo[] = [
      { ...base, id: "no-prazo", horasEstimadas: 10 },
      { ...base, id: "pouco", horasEstimadas: 5 },
      { ...base, id: "muito", horasEstimadas: 2 },
      { ...base, id: "bloqueado", coluna: "A fazer", bloqueado: true, bloqueadoEm: "2026-11-24T13:00:00Z" },
      { ...base, id: "feito", coluna: "Concluído", horasEstimadas: 1 },
    ];
    expect(alertasDoBoard(cartoes, "2026-11-24T18:00:00Z").map((a) => a.cartaoId)).toEqual(["muito", "pouco", "bloqueado"]);
  });
  it("formata a duração de forma curta", () => {
    expect(formatarDuracao(0.25)).toBe("15 min");
    expect(formatarDuracao(3.5)).toBe("3,5 h");
    expect(formatarDuracao(28)).toBe("1 d 4 h");
    expect(formatarDuracao(48)).toBe("2 d");
  });
  it("horas usadas do contrato = estimadas dos concluídos", () => {
    expect(
      horasDoContrato([
        { coluna: "Concluído", horasEstimadas: 8 },
        { coluna: "Concluído", horasEstimadas: 4 },
        { coluna: "Em andamento", horasEstimadas: 6 },
        { coluna: "Backlog", horasEstimadas: null },
      ]),
    ).toEqual({ usadas: 12, planejadas: 18, semEstimativa: 1 });
  });
});
