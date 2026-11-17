import { describe, expect, it } from "vitest";
import {
  eUuid,
  exigeConfirmacaoWip,
  formatarDataHora,
  limiteDaColuna,
  situacaoWip,
  validarCartao,
  validarLimitesWip,
  validarNomeProjeto,
} from "@/lib/board/regras";

describe("validarNomeProjeto", () => {
  it("aceita nome e remove espaços das pontas", () => {
    expect(validarNomeProjeto("  Shelper  ")).toEqual({ ok: true, dados: { nome: "Shelper" } });
  });
  it("recusa nome vazio com mensagem", () => {
    expect(validarNomeProjeto("   ")).toEqual({ ok: false, erros: { nome: "Informe o nome do projeto." } });
    expect(validarNomeProjeto(null).ok).toBe(false);
  });
  it("recusa nome com mais de 80 caracteres", () => {
    expect(validarNomeProjeto("a".repeat(81)).ok).toBe(false);
    expect(validarNomeProjeto("a".repeat(80)).ok).toBe(true);
  });
});

describe("validarCartao", () => {
  it("aceita título e pontos de Fibonacci", () => {
    for (const p of ["1", "2", "3", "5", "8", "13"]) {
      expect(validarCartao("Criar conta", p)).toEqual({ ok: true, dados: { titulo: "Criar conta", pontos: Number(p) } });
    }
  });
  it("título vazio mostra mensagem e não salva", () => {
    const r = validarCartao("  ", "3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.titulo).toBe("O título do cartão é obrigatório.");
  });
  it("pontos fora da escala mostram mensagem", () => {
    for (const p of ["0", "4", "21", "abc", ""]) {
      const r = validarCartao("Cartão", p);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erros.pontos).toMatch(/1, 2, 3, 5, 8 ou 13/);
    }
  });
});

describe("validarLimitesWip", () => {
  it("aceita inteiros de 1 a 20", () => {
    expect(validarLimitesWip("3", "2")).toEqual({ ok: true, dados: { andamento: 3, revisao: 2 } });
  });
  it("recusa zero, decimais e acima de 20", () => {
    expect(validarLimitesWip("0", "2").ok).toBe(false);
    expect(validarLimitesWip("2.5", "2").ok).toBe(false);
    expect(validarLimitesWip("3", "21").ok).toBe(false);
  });
});

describe("WIP", () => {
  const limites = { wipAndamento: 3, wipRevisao: 2 };
  it("só Em andamento e Em revisão têm limite", () => {
    expect(limiteDaColuna("Em andamento", limites)).toBe(3);
    expect(limiteDaColuna("Em revisão", limites)).toBe(2);
    expect(limiteDaColuna("Backlog", limites)).toBeNull();
    expect(limiteDaColuna("Concluído", limites)).toBeNull();
  });
  it("classifica a situação da coluna", () => {
    expect(situacaoWip(5, null)).toBe("sem_limite");
    expect(situacaoWip(1, 3)).toBe("livre");
    expect(situacaoWip(3, 3)).toBe("no_limite");
    expect(situacaoWip(4, 3)).toBe("acima");
  });
  it("pede confirmação ao mover para coluna cheia", () => {
    expect(exigeConfirmacaoWip(2, 3)).toBe(false);
    expect(exigeConfirmacaoWip(3, 3)).toBe(true);
    expect(exigeConfirmacaoWip(10, null)).toBe(false);
  });
});

describe("utilidades", () => {
  it("reconhece UUID", () => {
    expect(eUuid("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(eUuid("1; drop table")).toBe(false);
    expect(eUuid(undefined)).toBe(false);
  });
  it("formata a hora no horário de Brasília", () => {
    // 02:30 UTC de 11/11 = 23:30 de 10/11 em Brasília (UTC-3)
    expect(formatarDataHora("2026-11-11T02:30:00Z")).toBe("10/11, 23:30");
  });
});
