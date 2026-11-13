import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  criarClienteServidor: async () => ({ auth }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "https://shelper.test" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

const { cadastrar, entrar, sair } = await import("./acoes");

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [nome, valor] of Object.entries(campos)) form.set(nome, valor);
  return form;
}

const cadastro = {
  nome: "Ana Souza",
  email: "ana@exemplo.com",
  senha: "segredo123",
  confirmacao: "segredo123",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cadastrar", () => {
  it("cria a conta com nome nos metadados e entra direto quando há sessão", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: {} },
      error: null,
    });
    await expect(cadastrar({}, formulario(cadastro))).rejects.toThrow("REDIRECT:/painel");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ana@exemplo.com",
      password: "segredo123",
      options: {
        data: { nome: "Ana Souza" },
        emailRedirectTo: "https://shelper.test/auth/confirmar",
      },
    });
  });

  it("pede confirmação por e-mail quando o Supabase não devolve sessão", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    });
    const estado = await cadastrar({}, formulario(cadastro));
    expect(estado.sucesso).toContain("ana@exemplo.com");
  });

  it("não chama o Supabase quando a validação falha", async () => {
    const estado = await cadastrar(
      {},
      formulario({ ...cadastro, senha: "curta", confirmacao: "curta" }),
    );
    expect(estado.erros?.senha).toBeDefined();
    expect(estado.valores).toEqual({ nome: "Ana Souza", email: "ana@exemplo.com" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("informa e-mail duplicado (erro do Supabase)", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "user_already_exists", status: 422 },
    });
    const estado = await cadastrar({}, formulario(cadastro));
    expect(estado.mensagem).toMatch(/Já existe uma conta com este e-mail/);
  });

  it("informa e-mail duplicado (confirmação de e-mail ativa)", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    const estado = await cadastrar({}, formulario(cadastro));
    expect(estado.mensagem).toMatch(/Já existe uma conta com este e-mail/);
  });
});

describe("entrar", () => {
  it("redireciona para o destino interno informado", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const form = formulario({ email: "Ana@Exemplo.com", senha: "segredo123", proximo: "/painel/x" });
    await expect(entrar({}, form)).rejects.toThrow("REDIRECT:/painel/x");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ana@exemplo.com",
      password: "segredo123",
    });
  });

  it("ignora destinos externos", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const form = formulario({ email: "ana@exemplo.com", senha: "x", proximo: "https://mal.com" });
    await expect(entrar({}, form)).rejects.toThrow("REDIRECT:/painel");
  });

  it("mostra mensagem genérica para credenciais incorretas", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials", status: 400 },
    });
    const estado = await entrar({}, formulario({ email: "ana@exemplo.com", senha: "errada" }));
    expect(estado).toEqual({
      mensagem: "E-mail ou senha incorretos.",
      valores: { email: "ana@exemplo.com" },
    });
  });
});

describe("sair", () => {
  it("encerra a sessão e volta para a entrada", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(sair()).rejects.toThrow("REDIRECT:/entrar");
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("limpa a sessão local mesmo se o servidor falhar", async () => {
    auth.signOut
      .mockResolvedValueOnce({ error: { code: "unexpected_failure", status: 500 } })
      .mockResolvedValueOnce({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sair()).rejects.toThrow("REDIRECT:/entrar");
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: "local" });
  });
});
