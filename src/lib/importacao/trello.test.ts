import { describe, expect, it } from "vitest";
import {
  dataDoId,
  lerPontos,
  listasDoExport,
  montarImportacao,
  resumoDaImportacao,
  sugerirColuna,
  validarCartoesImportados,
  validarExport,
} from "./trello";

// Board pequeno no formato do export do Trello (só os campos que usamos).
const L = {
  backlog: "6af385b7a93c49aa140239d0",
  fazer: "6af385b7a93c49aa140239d1",
  and: "6af385b7a93c49aa140239d2",
  rev: "6af387ad719620e7f90e65bd",
  ok: "6af387b415e91b452aecb73b",
  velha: "6af387b415e91b452aecb799",
};
const C1 = "6af387f5ca36801964e2c5ff";
const C2 = "6af3880954d13caaffe7ec62";
const exportado = {
  lists: [
    { id: L.backlog, name: "Backlog", closed: false },
    { id: L.fazer, name: "A Fazer (Sprint)", closed: false },
    { id: L.and, name: "Em andamento (WIP 3)", closed: false },
    { id: L.rev, name: "Em revisão (WIP 2)", closed: false },
    { id: L.ok, name: "Concluído", closed: false },
    { id: L.velha, name: "Arquivo", closed: true },
  ],
  cards: [
    {
      id: C1,
      name: "H1 - (3) Cadastro e login",
      desc: "Como visitante, quero entrar.",
      idList: L.ok,
      closed: false,
      dateLastActivity: "2026-11-13T02:52:10.282Z",
    },
    { id: C2, name: "H9 - (4) Ver WIP por dia", desc: "", idList: L.fazer, closed: false },
    { id: "6af3880954d13caaffe7ec99", name: "Arquivado", idList: L.ok, closed: true },
  ],
  checklists: [
    {
      idCard: C1,
      checkItems: [
        { name: "- Login e logout", state: "complete", pos: 2 },
        { name: "Cadastro com nome", state: "incomplete", pos: 1 },
      ],
    },
  ],
  actions: [
    {
      type: "updateCard",
      date: "2026-11-12T10:00:00.000Z",
      data: { card: { id: C1 }, listBefore: { id: L.fazer }, listAfter: { id: L.and } },
    },
    { type: "createCard", date: "2026-11-10T22:00:00.000Z", data: { card: { id: C1 }, list: { id: L.fazer } } },
    {
      type: "updateCard",
      date: "2026-11-13T02:52:00.000Z",
      data: { card: { id: C1 }, listBefore: { id: L.and }, listAfter: { id: L.ok } },
    },
    { type: "commentCard", date: "2026-11-13T03:00:00.000Z", data: { card: { id: C1 } } },
  ],
};
const mapa = { [L.backlog]: "Backlog", [L.fazer]: "A fazer", [L.and]: "Em andamento", [L.rev]: "Em revisão", [L.ok]: "Concluído" } as const;

describe("importação do Trello", () => {
  it("sugere a coluna pelo nome da lista", () => {
    expect(sugerirColuna("A Fazer (Sprint)")).toBe("A fazer");
    expect(sugerirColuna("Em andamento (WIP 3)")).toBe("Em andamento");
    expect(sugerirColuna("Em revisão (WIP 2)")).toBe("Em revisão");
    expect(sugerirColuna("Done")).toBe("Concluído");
    expect(sugerirColuna("Ideias soltas")).toBe("Backlog");
    expect(sugerirColuna("Reuniões")).toBeNull();
  });

  it("lê pontos e a data guardada no id", () => {
    expect(lerPontos("H5 - (3) Criar Sprint")).toEqual({ pontos: 3, valido: true, achou: true });
    expect(lerPontos("T1 - Definir stack")).toEqual({ pontos: 0, valido: true, achou: false });
    expect(lerPontos("H9 - (4) Algo").valido).toBe(false);
    expect(dataDoId("6af387f5ca36801964e2c5ff")).toBe(new Date(0x6af387f5 * 1000).toISOString());
    expect(dataDoId("abc")).toBeNull();
  });

  it("recusa arquivo que não é export de board", () => {
    expect(validarExport({ foo: 1 }).ok).toBe(false);
    expect(validarExport([]).ok).toBe(false);
    expect(validarExport(exportado).ok).toBe(true);
  });

  it("lista só as listas abertas, com a contagem de cartões abertos", () => {
    const l = listasDoExport(exportado);
    expect(l.map((x) => x.nome)).toEqual(["Backlog", "A Fazer (Sprint)", "Em andamento (WIP 3)", "Em revisão (WIP 2)", "Concluído"]);
    expect(l.find((x) => x.nome === "Concluído")?.cartoes).toBe(1);
  });

  it("recria criação e movimentos com as datas do Trello", () => {
    const imp = montarImportacao(exportado, mapa);
    const h1 = imp.cartoes.find((c) => c.titulo.startsWith("H1"))!;
    expect(h1.pontos).toBe(3);
    expect(h1.coluna).toBe("Concluído");
    expect(h1.criadoEm).toBe("2026-11-10T22:00:00.000Z");
    expect(h1.eventos).toEqual([
      { de: null, para: "A fazer", em: "2026-11-10T22:00:00.000Z" },
      { de: "A fazer", para: "Em andamento", em: "2026-11-12T10:00:00.000Z" },
      { de: "Em andamento", para: "Concluído", em: "2026-11-13T02:52:00.000Z" },
    ]);
    expect(h1.checklist).toEqual([
      { texto: "Cadastro com nome", feito: false },
      { texto: "Login e logout", feito: true },
    ]);
    expect(imp.cartoes).toHaveLength(2); // o arquivado fica de fora
  });

  it("sem ação de criação usa a data do id e avisa pontos fora da escala", () => {
    const imp = montarImportacao(exportado, mapa);
    const h9 = imp.cartoes.find((c) => c.titulo.startsWith("H9"))!;
    expect(h9.criadoEm).toBe(dataDoId(C2));
    expect(h9.eventos).toEqual([{ de: null, para: "A fazer", em: dataDoId(C2) }]);
    expect(h9.pontos).toBe(0);
    expect(imp.avisos.some((a) => a.includes("Fibonacci"))).toBe(true);
  });

  it("lista sem coluna não entra, e o cartão termina na coluna atual", () => {
    const imp = montarImportacao(exportado, { ...mapa, [L.fazer]: null });
    expect(imp.cartoes.map((c) => c.titulo)).toEqual(["H1 - (3) Cadastro e login"]);
    expect(imp.avisos[0]).toContain("sem coluna");
    const h1 = imp.cartoes[0];
    expect(h1.eventos[0]).toEqual({ de: null, para: "Em andamento", em: "2026-11-10T22:00:00.000Z" });
    expect(h1.eventos.at(-1)?.para).toBe("Concluído");
    expect(resumoDaImportacao(imp).find((r) => r.coluna === "Concluído")).toEqual({ coluna: "Concluído", cartoes: 1, pontos: 3 });
  });
});

describe("conferência no servidor", () => {
  it("aceita o que a montagem gera e recusa dados adulterados", () => {
    const imp = montarImportacao(exportado, mapa);
    expect(validarCartoesImportados(imp.cartoes).ok).toBe(true);
    expect(validarCartoesImportados([]).ok).toBe(false);
    expect(validarCartoesImportados([{ ...imp.cartoes[0], pontos: 4 }]).ok).toBe(false);
    expect(validarCartoesImportados([{ ...imp.cartoes[0], coluna: "Lixo" }]).ok).toBe(false);
    expect(validarCartoesImportados([{ ...imp.cartoes[0], coluna: "Backlog" }]).ok).toBe(false); // termina em outra coluna
    expect(validarCartoesImportados([{ ...imp.cartoes[0], eventos: [] }]).ok).toBe(false);
  });
});
