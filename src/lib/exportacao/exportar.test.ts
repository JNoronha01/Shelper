import { describe, expect, it } from "vitest";
import type { Cartao } from "@/lib/board/dados";
import { lerArquivo } from "@/lib/importacao/fonte";
import { validarCartoesImportados } from "@/lib/importacao/trello";
import { basicoCsv, cartoesCsv, completoJson, movimentosCsv, nomeDoArquivo, paraCsv, type DadosExportacao } from "./exportar";

const cartao = (c: Partial<Cartao> & Pick<Cartao, "id" | "titulo" | "coluna">): Cartao => ({
  pontos: 3,
  criadoEm: "2026-11-10T12:00:00.000Z",
  sprintId: "s1",
  descricao: null,
  checklist: [],
  responsavelId: "u1",
  horasEstimadas: 4.5,
  bloqueado: false,
  motivoBloqueio: null,
  bloqueadoEm: null,
  inicioAndamento: null,
  ...c,
});

const dados: DadosExportacao = {
  projeto: { id: "p", nome: "Shelper - Sprint 1" },
  cartoes: [
    cartao({ id: "c1", titulo: "H1 - Login", coluna: "Concluído", checklist: [{ id: "i", texto: "Tela", feito: true }] }),
    cartao({ id: "c2", titulo: "=SOMA(A1)", coluna: "Backlog", sprintId: null, responsavelId: null, descricao: "linha 1\nlinha; 2" }),
  ],
  sprints: [{ id: "s1", numero: 1, inicio: "2026-11-10", fim: "2026-11-17", meta: "MVP", encerrada: true }],
  time: [{ usuarioId: "u1", nome: "Ana", email: "a@x.com", funcao: "dev", entrouEm: "", foto: null }],
  eventos: [
    { cartaoId: "c1", de: null, para: "A fazer", em: "2026-11-10T12:00:00.000Z" },
    { cartaoId: "c1", de: "A fazer", para: "Em andamento", em: "2026-11-11T12:00:00.000Z" },
    { cartaoId: "c1", de: "Em andamento", para: "Concluído", em: "2026-11-12T18:00:00.000Z" },
    { cartaoId: "c2", de: null, para: "Backlog", em: "2026-11-10T12:00:00.000Z" },
  ],
  geradoEm: "2026-11-26T12:00:00.000Z",
};

describe("exportação", () => {
  it("CSV escapa separador, aspas e quebra de linha e neutraliza fórmulas", () => {
    expect(paraCsv([["a;b", 'x"y', "=1+1", -2]], ";")).toBe('\uFEFF"a;b";"x""y";\'=1+1;-2\r\n');
  });

  it("cartões com métricas, sprint e responsável, no formato do Excel em português", () => {
    const texto = cartoesCsv(dados);
    expect(texto.charCodeAt(0)).toBe(0xfeff);
    const linhas = texto.slice(1).trim().split("\r\n");
    expect(linhas[0]).toMatch(/^ID;Título;Pontos;Coluna;Sprint;Responsável/);
    expect(linhas[1]).toBe(
      "c1;H1 - Login;3;Concluído;Sprint 1;Ana;4,5;10/11/2026 09:00;11/11/2026 09:00;12/11/2026 15:00;2;30,0;Não;;1;1;",
    );
    expect(linhas[2]).toContain("'=SOMA(A1)");
  });

  it("movimentos e básico (Jira)", () => {
    expect(movimentosCsv(dados).split("\r\n")).toHaveLength(6); // cabeçalho + 4 + linha vazia
    const basico = basicoCsv(dados).split("\r\n");
    expect(basico[0]).toBe("\uFEFFSummary,Description,Issue Type,Status,Story Points,Sprint,Assignee,Created,Labels");
    expect(basico[1]).toBe("H1 - Login,,Story,Done,3,Sprint 1,Ana,2026-11-10,Concluído");
  });

  it("o JSON completo volta pela importação com o mesmo histórico", () => {
    const r = lerArquivo("backup.json", completoJson(dados));
    if (!r.ok) throw new Error(r.erro);
    expect(r.fonte.origem).toBe("shelper");
    const imp = r.fonte.montar(Object.fromEntries(r.fonte.listas.map((l) => [l.id, l.sugestao])));
    expect(validarCartoesImportados(imp.cartoes).ok).toBe(true);
    const h1 = imp.cartoes.find((c) => c.titulo === "H1 - Login")!;
    expect(h1.origem).toBe("shelper:c1");
    expect(h1.eventos.map((e) => e.para)).toEqual(["A fazer", "Em andamento", "Concluído"]);
    expect(h1.checklist).toEqual([{ texto: "Tela", feito: true }]);
  });

  it("nome do arquivo sem acento nem espaço", () => {
    expect(nomeDoArquivo("Shelper - Sprint 1", "cartoes", "csv", dados.geradoEm)).toBe("shelper-shelper-sprint-1-cartoes-2026-11-26.csv");
  });
});
