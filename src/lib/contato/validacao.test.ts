import { describe, expect, it } from "vitest";
import { validarContato } from "./validacao";

const form = (c: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(c)) f.set(k, v);
  return f;
};

describe("formulário de contato", () => {
  it("aceita mensagem completa e normaliza nome e e-mail", () => {
    expect(
      validarContato(form({ nome: "  Ana  Souza ", email: " Ana@Exemplo.com", assunto: "duvida", mensagem: "Como importo do Trello?" })),
    ).toEqual({
      ok: true,
      dados: { nome: "Ana Souza", email: "ana@exemplo.com", assunto: "duvida", mensagem: "Como importo do Trello?" },
    });
  });
  it("aponta cada campo que falta", () => {
    const r = validarContato(form({ nome: "A", email: "x", assunto: "spam", mensagem: "oi" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["assunto", "email", "mensagem", "nome"]);
  });
});
