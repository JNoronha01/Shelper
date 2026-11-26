import { describe, expect, it } from "vitest";
import { analisarCsv, lerCsv, lerData, listasDoCsv, montarDoCsv, MODELO_CSV } from "./csv";

describe("leitura de CSV", () => {
  it("entende aspas, aspas dobradas, quebra de linha e o separador ; ou ,", () => {
    expect(lerCsv('a,b\r\n"x, y","diz ""oi""\nlinha 2"\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'diz "oi"\nlinha 2'],
    ]);
    expect(lerCsv("\uFEFFTítulo;Coluna\nH1;Backlog")).toEqual([
      ["Título", "Coluna"],
      ["H1", "Backlog"],
    ]);
  });

  it("lê datas do Trello, de planilha e do Jira no horário de Brasília", () => {
    expect(lerData("2026-11-12T21:30:00.000Z")).toBe("2026-11-12T21:30:00.000Z");
    expect(lerData("12/11/2026 18:30")).toBe("2026-11-12T21:30:00.000Z");
    expect(lerData("12/Nov/26 6:30 PM")).toBe("2026-11-12T21:30:00.000Z");
    expect(lerData("ontem")).toBeNull();
  });
});

describe("importação por CSV", () => {
  const agora = "2026-11-26T12:00:00.000Z";

  it("modelo do Shelper: colunas, pontos e datas", () => {
    const r = analisarCsv(MODELO_CSV);
    if (!r.ok) throw new Error(r.erro);
    const listas = listasDoCsv(r.csv);
    expect(listas.map((l) => [l.nome, l.sugestao])).toEqual([
      ["Concluído", "Concluído"],
      ["Em andamento", "Em andamento"],
      ["Backlog", "Backlog"],
    ]);
    const imp = montarDoCsv(r.csv, Object.fromEntries(listas.map((l) => [l.id, l.sugestao])), agora);
    const h1 = imp.cartoes[0];
    expect(h1).toMatchObject({ titulo: "H1 - Cadastro e login", pontos: 3, coluna: "Concluído", criadoEm: "2026-11-10T12:00:00.000Z" });
    expect(h1.eventos).toEqual([
      { de: null, para: "Backlog", em: "2026-11-10T12:00:00.000Z" },
      { de: "Backlog", para: "Concluído", em: "2026-11-12T21:30:00.000Z" },
    ]);
    expect(imp.cartoes[2].eventos).toHaveLength(1); // ficou no Backlog
    expect(imp.avisos[0]).toMatch(/não traz o histórico/);
  });

  it("CSV do Jira: Summary, Status, Story Points e Issue key", () => {
    const jira =
      "Summary,Issue key,Status,Custom field (Story Points),Created,Resolved\nLogin,SH-1,Done,5,10/Nov/26 9:00 AM,12/Nov/26 6:30 PM\nPerfil,SH-2,In Progress,4,11/Nov/26 9:00 AM,";
    const r = analisarCsv(jira);
    if (!r.ok) throw new Error(r.erro);
    const listas = listasDoCsv(r.csv);
    expect(listas.map((l) => l.sugestao)).toEqual(["Concluído", "Em andamento"]);
    const imp = montarDoCsv(r.csv, { Done: "Concluído", "In Progress": "Em andamento" }, agora);
    expect(imp.cartoes.map((c) => [c.origem, c.pontos])).toEqual([
      ["csv:SH-1", 5],
      ["csv:SH-2", 0],
    ]);
    expect(imp.avisos.some((a) => a.includes("Fibonacci"))).toBe(true);
  });

  it("CSV do Trello: ignora arquivados e lê os pontos do título", () => {
    const trello =
      '"Card ID","Card Name","List Name","Archived"\n"a1","H1 - (3) Login","Concluído","false"\n"a2","Velho","Concluído","true"';
    const r = analisarCsv(trello);
    if (!r.ok) throw new Error(r.erro);
    const imp = montarDoCsv(r.csv, { Concluído: "Concluído" }, agora);
    expect(imp.cartoes).toHaveLength(1);
    expect(imp.cartoes[0].pontos).toBe(3);
  });

  it("recusa CSV sem coluna de título", () => {
    expect(analisarCsv("Coluna\nBacklog").ok).toBe(false);
  });
});
