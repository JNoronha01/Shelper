import { describe, expect, it } from "vitest";
import {
  validarCadastro,
  validarFoto,
  validarLogin,
  validarNomePerfil,
  validarTrocaDeEmail,
  validarTrocaDeSenha,
  problemaDaSenha,
  validarNovaSenha,
  validarPedidoDeSenha,
} from "@/lib/auth/validacao";

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [nome, valor] of Object.entries(campos)) form.set(nome, valor);
  return form;
}

const cadastroValido = {
  nome: "  Ana   Souza ",
  email: " Ana@Exemplo.COM ",
  senha: "Segredo#123",
  confirmacao: "Segredo#123",
};

describe("validarCadastro", () => {
  it("aceita dados válidos e normaliza nome e e-mail", () => {
    expect(validarCadastro(formulario(cadastroValido))).toEqual({
      ok: true,
      dados: { nome: "Ana Souza", email: "ana@exemplo.com", senha: "Segredo#123" },
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
    const resultado = validarCadastro(formulario({ ...cadastroValido, senha: "Ab#1234", confirmacao: "Ab#1234" }));
    expect(resultado).toEqual({ ok: false, erros: { senha: "A senha precisa de: pelo menos 8 caracteres." } });
  });

  it("aceita senha com exatamente 8 caracteres e as quatro regras", () => {
    const resultado = validarCadastro(formulario({ ...cadastroValido, senha: "Abcd#123", confirmacao: "Abcd#123" }));
    expect(resultado.ok).toBe(true);
  });

  it("exige maiúscula, número e caractere especial e diz o que falta", () => {
    expect(problemaDaSenha("abcdefgh")).toBe("A senha precisa de: uma letra maiúscula, um número, um caractere especial (!@#$%&*…).");
    expect(problemaDaSenha("Abcdefgh1")).toBe("A senha precisa de: um caractere especial (!@#$%&*…).");
    expect(problemaDaSenha("ÁRVORE_mãe7")).toBeUndefined(); // acento conta como letra; _ conta como especial
    expect(problemaDaSenha("Senha 1234")).toBe("A senha precisa de: um caractere especial (!@#$%&*…)."); // espaço não conta
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

describe("editar perfil", () => {
  const form = (dados: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(dados)) f.set(k, v);
    return f;
  };
  it("nome com pelo menos 2 letras e espaços normalizados", () => {
    expect(validarNomePerfil(form({ nome: "  Jorge   Noronha " }))).toEqual({ ok: true, dados: { nome: "Jorge Noronha" } });
    expect(validarNomePerfil(form({ nome: "J" })).ok).toBe(false);
  });
  it("troca de senha confere a atual, o tamanho e a repetição", () => {
    expect(validarTrocaDeSenha(form({ atual: "senha-velha", nova: "Senha-nova-1", confirmacao: "Senha-nova-1" })).ok).toBe(true);
    expect(validarTrocaDeSenha(form({ atual: "senha-velha", nova: "senhanova1", confirmacao: "senhanova1" })).ok).toBe(false);
    const r = validarTrocaDeSenha(form({ atual: "", nova: "curta", confirmacao: "outra" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["atual", "confirmacao", "nova"]);
    const igual = validarTrocaDeSenha(form({ atual: "Mesma-senha1", nova: "Mesma-senha1", confirmacao: "Mesma-senha1" }));
    expect(igual.ok).toBe(false);
  });
  it("troca de e-mail pede um e-mail novo e válido e a senha", () => {
    expect(validarTrocaDeEmail(form({ email: " Novo@Exemplo.com ", senha: "x" }), "velho@exemplo.com")).toEqual({
      ok: true,
      dados: { email: "novo@exemplo.com", senha: "x" },
    });
    expect(validarTrocaDeEmail(form({ email: "velho@exemplo.com", senha: "x" }), "velho@exemplo.com").ok).toBe(false);
    expect(validarTrocaDeEmail(form({ email: "invalido", senha: "" }), "velho@exemplo.com").ok).toBe(false);
  });
  it("foto: só imagem até 1 MB", () => {
    expect(validarFoto(new File([new Uint8Array(10)], "f.webp", { type: "image/webp" })).ok).toBe(true);
    expect(validarFoto(new File([new Uint8Array(10)], "f.gif", { type: "image/gif" })).ok).toBe(false);
    expect(validarFoto(new File([new Uint8Array(1024 * 1024 + 1)], "f.png", { type: "image/png" })).ok).toBe(false);
    expect(validarFoto(null).ok).toBe(false);
  });
});

describe("esqueci minha senha", () => {
  const form = (c: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(c)) f.set(k, v);
    return f;
  };
  it("pedido aceita e-mail válido e normaliza", () => {
    expect(validarPedidoDeSenha(form({ email: " Ana@Exemplo.com " }))).toEqual({ ok: true, dados: { email: "ana@exemplo.com" } });
    expect(validarPedidoDeSenha(form({ email: "ana" })).ok).toBe(false);
  });
  it("nova senha segue as regras e precisa ser repetida", () => {
    expect(validarNovaSenha(form({ senha: "Nova#Senha1", confirmacao: "Nova#Senha1" })).ok).toBe(true);
    expect(validarNovaSenha(form({ senha: "fraca", confirmacao: "fraca" })).ok).toBe(false);
    expect(validarNovaSenha(form({ senha: "Nova#Senha1", confirmacao: "Outra#1" })).ok).toBe(false);
  });
});
