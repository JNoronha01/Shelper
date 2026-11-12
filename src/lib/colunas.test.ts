import { describe, expect, it } from "vitest";
import { COLUNAS, colunaAnterior, proximaColuna } from "@/lib/colunas";

describe("colunas do board", () => {
  it("tem as 5 colunas fixas na ordem do fluxo", () => {
    expect(COLUNAS).toEqual([
      "Backlog",
      "A fazer",
      "Em andamento",
      "Em revisão",
      "Concluído",
    ]);
  });

  it("Avançar leva à próxima coluna e para em Concluído", () => {
    expect(proximaColuna("Backlog")).toBe("A fazer");
    expect(proximaColuna("Em revisão")).toBe("Concluído");
    expect(proximaColuna("Concluído")).toBeNull();
  });

  it("Voltar leva à coluna anterior e para em Backlog", () => {
    expect(colunaAnterior("Concluído")).toBe("Em revisão");
    expect(colunaAnterior("A fazer")).toBe("Backlog");
    expect(colunaAnterior("Backlog")).toBeNull();
  });
});
