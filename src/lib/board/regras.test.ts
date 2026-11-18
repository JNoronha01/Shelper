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
  validarNovoProjeto,
  validarNovoCartao,
  validarItemChecklist,
  validarDiasConvite,
  valorDeVotoValido,
  resumoDosVotos,
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
    for (const p of ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"]) {
      expect(validarCartao("Criar conta", p)).toEqual({ ok: true, dados: { titulo: "Criar conta", pontos: Number(p) } });
    }
  });
  it("título vazio mostra mensagem e não salva", () => {
    const r = validarCartao("  ", "3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.titulo).toBe("O título do cartão é obrigatório.");
  });
  it("pontos fora da escala mostram mensagem", () => {
    for (const p of ["4", "100", "-1", "abc", ""]) {
      const r = validarCartao("Cartão", p);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erros.pontos).toMatch(/55 ou 89/);
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

import { validarMetas, validarSprint } from "@/lib/board/regras";

describe("validarSprint", () => {
  it("aceita datas e Meta opcional", () => {
    expect(validarSprint("2026-11-17", "2026-11-24", "Dashboard no ar")).toEqual({
      ok: true,
      dados: { inicio: "2026-11-17", fim: "2026-11-24", meta: "Dashboard no ar" },
    });
    expect(validarSprint("2026-11-17", "2026-11-17", "")).toMatchObject({ ok: true, dados: { meta: null } });
  });
  it("fim antes do início mostra erro (critério da H5)", () => {
    expect(validarSprint("2026-11-24", "2026-11-17", "")).toEqual({
      ok: false,
      erros: { fim: "A data de fim não pode ser antes da data de início." },
    });
  });
  it("recusa datas vazias ou inválidas e Meta longa demais", () => {
    expect(validarSprint("", "2026-11-17", "").ok).toBe(false);
    expect(validarSprint("2026-13-40", "2026-11-17", "").ok).toBe(false);
    expect(validarSprint("2026-11-17", "2026-11-24", "a".repeat(301)).ok).toBe(false);
  });
});

describe("validarMetas", () => {
  it("aceita vazio (sem meta), decimal com vírgula e inteiro", () => {
    expect(validarMetas("", "", "")).toEqual({ ok: true, dados: { lead: null, cycle: null, velocity: null } });
    expect(validarMetas("3,5", "2", "13")).toEqual({ ok: true, dados: { lead: 3.5, cycle: 2, velocity: 13 } });
  });
  it("recusa zero, negativo, texto e Velocity fracionada", () => {
    expect(validarMetas("0", "", "").ok).toBe(false);
    expect(validarMetas("", "-1", "").ok).toBe(false);
    expect(validarMetas("abc", "", "").ok).toBe(false);
    expect(validarMetas("", "", "2.5").ok).toBe(false);
  });
});

describe("ideias do professor", () => {
  it("novo projeto já vem com o WIP escolhido pelo time", () => {
    expect(validarNovoProjeto("Shelper", "4", "2")).toEqual({ ok: true, dados: { nome: "Shelper", andamento: 4, revisao: 2 } });
    const r = validarNovoProjeto("", "0", "2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["andamento", "nome"]);
  });
  it("novo cartão escolhe a coluna e aceita descrição opcional", () => {
    expect(validarNovoCartao("Tela", "5", "Em andamento", "  ")).toEqual({
      ok: true,
      dados: { titulo: "Tela", pontos: 5, coluna: "Em andamento", descricao: null },
    });
    const r = validarNovoCartao("Tela", "5", "Arquivado", "x".repeat(2001));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["coluna", "descricao"]);
  });
  it("item do checklist não pode ser vazio nem longo demais", () => {
    expect(validarItemChecklist(" Testar ")).toEqual({ ok: true, dados: { texto: "Testar" } });
    expect(validarItemChecklist("  ").ok).toBe(false);
    expect(validarItemChecklist("x".repeat(201)).ok).toBe(false);
  });
  it("convite vale de 1 a 30 dias", () => {
    expect(validarDiasConvite("7")).toEqual({ ok: true, dados: { dias: 7 } });
    expect(validarDiasConvite("0").ok).toBe(false);
    expect(validarDiasConvite("31").ok).toBe(false);
  });
  it("baralho da votação: Fibonacci para pontos, 1 a 20 para WIP", () => {
    expect(valorDeVotoValido("pontos", 21)).toBe(true);
    expect(valorDeVotoValido("pontos", 4)).toBe(false);
    expect(valorDeVotoValido("wip", 20)).toBe(true);
    expect(valorDeVotoValido("wip", 21)).toBe(false);
  });
  it("resume os votos e sugere o valor do baralho mais perto da média", () => {
    expect(resumoDosVotos("pontos", [])).toBeNull();
    expect(resumoDosVotos("pontos", [3, 5, 8])).toMatchObject({ menor: 3, maior: 8, sugestao: 5, consenso: false });
    expect(resumoDosVotos("pontos", [5, 5])).toMatchObject({ sugestao: 5, consenso: true });
    expect(resumoDosVotos("wip", [2, 3])).toMatchObject({ media: 2.5, sugestao: 2 });
  });
});
