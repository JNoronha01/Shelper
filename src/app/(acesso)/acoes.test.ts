import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getClaims: vi.fn(),
  updateUser: vi.fn(),
};
const rpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  criarClienteServidor: async () => ({ auth, rpc }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "https://shelper.test" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  },
}));

const { cadastrar, entrar, pedirNovaSenha, redefinirSenha, sair, sairDeTodos } = await import("./acoes");

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [nome, valor] of Object.entries(campos)) form.set(nome, valor);
  return form;
}

const cadastro = {
  nome: "Ana Souza",
  email: "ana@exemplo.com",
  senha: "Segredo#123",
  confirmacao: "Segredo#123",
};

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockImplementation(async (nome: string) => ({ data: nome === "login_bloqueado" ? 0 : nome === "login_falhou" ? { restantes: 4, segundos: 0 } : null, error: null }));
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
      password: "Segredo#123",
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

describe("bloqueio por tentativas", () => {
  const erroSenha = { data: {}, error: { code: "invalid_credentials", status: 400 } };

  it("não confere a senha enquanto o e-mail está bloqueado", async () => {
    rpc.mockResolvedValueOnce({ data: 600, error: null });
    const estado = await entrar({}, formulario({ email: "ana@exemplo.com", senha: "x" }));
    expect(estado.mensagem).toMatch(/bloqueado por mais 10 minutos/);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("avisa quando faltam poucas tentativas e quando bloqueia", async () => {
    auth.signInWithPassword.mockResolvedValue(erroSenha);
    rpc.mockResolvedValueOnce({ data: 0, error: null }).mockResolvedValueOnce({ data: { restantes: 2, segundos: 0 }, error: null });
    expect((await entrar({}, formulario({ email: "ana@exemplo.com", senha: "x" }))).mensagem).toBe(
      "E-mail ou senha incorretos. Mais 2 tentativas antes de bloquear por 15 minutos.",
    );
    rpc.mockResolvedValueOnce({ data: 0, error: null }).mockResolvedValueOnce({ data: { restantes: 0, segundos: 900 }, error: null });
    expect((await entrar({}, formulario({ email: "ana@exemplo.com", senha: "x" }))).mensagem).toMatch(/ficou bloqueado por 15 minutos/);
  });

  it("zera a contagem quando entra certo", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    await expect(entrar({}, formulario({ email: "ana@exemplo.com", senha: "Certa#123" }))).rejects.toThrow("REDIRECT:/painel");
    expect(rpc).toHaveBeenCalledWith("login_ok");
  });
});

describe("esqueci minha senha", () => {
  it("manda o link e responde igual exista ou não a conta", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const estado = await pedirNovaSenha({}, formulario({ email: "Ana@Exemplo.com" }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("ana@exemplo.com", {
      redirectTo: "https://shelper.test/auth/confirmar?proximo=/painel/nova-senha",
    });
    expect(estado.sucesso).toMatch(/Se existir uma conta com ana@exemplo.com/);
  });

  it("só troca a senha numa sessão aberta pelo link", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "password", timestamp: Date.now() / 1000 }] } } });
    const recusado = await redefinirSenha({}, formulario({ senha: "Nova#Senha1", confirmacao: "Nova#Senha1" }));
    expect(recusado.mensagem).toMatch(/expirou/);
    expect(auth.updateUser).not.toHaveBeenCalled();

    auth.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "otp", timestamp: Date.now() / 1000 - 30 }] } } });
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    const ok = await redefinirSenha({}, formulario({ senha: "Nova#Senha1", confirmacao: "Nova#Senha1" }));
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "Nova#Senha1" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(ok.sucesso).toMatch(/Senha alterada/);
  });
});

describe("sair", () => {
  it("sair de todos encerra as sessões em todos os aparelhos", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(sairDeTodos()).rejects.toThrow("REDIRECT:/entrar?saiu=todos");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

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
