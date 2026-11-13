import { describe, expect, it } from "vitest";
import { validarCadastro, validarLogin } from "@/lib/auth/validacao";

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [nome, valor] of Object.entries(campos)) form.set(nome, valor);
  return form;
}

const cadastroValido = {
  nome: "  Ana   Souza ",
  email: " Ana@Exemplo.COM ",
  senha: "segredo123",
  confirmacao: "segredo123",
};

describe("validarCadastro", () => {
  it("aceita dados válidos e normaliza nome e e-mail", () => {
    expect(validarCadastro(formulario(cadastroValido))).toEqual({
      ok: true,
      dados: { nome: "Ana Souza", email: "ana@exemplo.com", senha: "segredo123" },
    });
  });

  it("exige todos os campos", () => {
    const resultado = validarCadastro(new FormData());
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(Object.keys(resultado.erros).sort()).toEqual(["confirmacao", "email", "nome", "senha"]);
    }
  });

  it("rejeita e-mail em formato inválido", () => {
    const resultado = validarCadastro(formulario({ ...cadastroValido, email: "ana@exemplo" }));
    expect(resultado).toMatchObject({ ok: false, erros: { email: expect.any(String) } });
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const resultado = validarCadastro(
      formulario({ ...cadastroValido, senha: "1234567", confirmacao: "1234567" }),
    );
    expect(resultado).toEqual({
      ok: false,
      erros: { senha: "A senha precisa ter pelo menos 8 caracteres." },
    });
  });

  it("aceita senha com exatamente 8 caracteres", () => {
    const resultado = validarCadastro(
      formulario({ ...cadastroValido, senha: "12345678", confirmacao: "12345678" }),
    );
    expect(resultado.ok).toBe(true);
  });

  it("rejeita senha acima do limite do bcrypt (72 bytes)", () => {
    const longa = "a".repeat(73);
    const resultado = validarCadastro(formulario({ ...cadastroValido, senha: longa, confirmacao: longa }));
    expect(resultado).toMatchObject({ ok: false, erros: { senha: expect.any(String) } });
  });

  it("rejeita confirmação diferente da senha", () => {
    const resultado = validarCadastro(formulario({ ...cadastroValido, confirmacao: "outrasenha" }));
    expect(resultado).toEqual({ ok: false, erros: { confirmacao: "As senhas não coincidem." } });
  });
});

describe("validarLogin", () => {
  it("aceita e-mail e senha", () => {
    expect(validarLogin(formulario({ email: "ANA@exemplo.com", senha: "x" }))).toEqual({
      ok: true,
      dados: { email: "ana@exemplo.com", senha: "x" },
    });
  });

  it("exige e-mail válido e senha", () => {
    expect(validarLogin(formulario({ email: "ana", senha: "" }))).toMatchObject({
      ok: false,
      erros: { email: expect.any(String), senha: "Informe sua senha." },
    });
  });
});
