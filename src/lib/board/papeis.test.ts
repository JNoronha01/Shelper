import { describe, expect, it } from "vitest";
import { abasDoPapel, pode } from "./papeis";

describe("papéis no time", () => {
  it("o PO pode tudo", () => {
    for (const p of ["criarCartao", "gerirSprint", "verMetricasTime", "conduzirVotacao", "alterarWip", "editarCadastro", "gerirTime"] as const) {
      expect(pode("po", p)).toBe(true);
    }
  });
  it("o SM cuida da Sprint, das métricas, do WIP e das votações, mas não cria cartão nem mexe no time", () => {
    expect(pode("sm", "gerirSprint")).toBe(true);
    expect(pode("sm", "alterarWip")).toBe(true);
    expect(pode("sm", "conduzirVotacao")).toBe(true);
    expect(pode("sm", "criarCartao")).toBe(false);
    expect(pode("sm", "editarCadastro")).toBe(false);
    expect(pode("sm", "gerirTime")).toBe(false);
  });
  it("o desenvolvedor não cria nem altera regras", () => {
    for (const p of ["criarCartao", "gerirSprint", "verMetricasTime", "verHistorico", "conduzirVotacao", "alterarWip", "editarCadastro", "gerirTime"] as const) {
      expect(pode("dev", p)).toBe(false);
    }
  });
  it("cada papel vê só as abas que usa", () => {
    expect(abasDoPapel("dev")).toEqual(["board", "sprint", "votacao", "time"]);
    expect(abasDoPapel("sm")).toEqual(["board", "sprint", "metricas", "votacao", "historico", "time", "projeto"]);
    expect(abasDoPapel("po")).toEqual(abasDoPapel("sm"));
  });
});
