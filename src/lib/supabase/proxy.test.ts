import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "chave-publica";

const { atualizarSessao } = await import("./proxy");

function requisicao(caminho: string, method = "GET"): NextRequest {
  return new NextRequest(new URL(caminho, "https://shelper.test"), { method });
}

beforeEach(() => getUser.mockReset());

describe("atualizarSessao", () => {
  it("manda visitante sem sessão do painel para a entrada, guardando o destino", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const resposta = await atualizarSessao(requisicao("/painel/config?aba=1"));
    expect(resposta.status).toBe(307);
    const destino = new URL(resposta.headers.get("location")!);
    expect(destino.pathname).toBe("/entrar");
    expect(destino.searchParams.get("proximo")).toBe("/painel/config?aba=1");
  });

  it("deixa usuário autenticado acessar o painel", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const resposta = await atualizarSessao(requisicao("/painel"));
    expect(resposta.headers.get("location")).toBeNull();
    expect(resposta.headers.get("x-middleware-next")).toBe("1");
  });

  it("leva usuário autenticado da entrada para o painel", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const resposta = await atualizarSessao(requisicao("/entrar"));
    expect(new URL(resposta.headers.get("location")!).pathname).toBe("/painel");
  });

  it("não redireciona APIs: elas respondem 401 por conta própria", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const resposta = await atualizarSessao(requisicao("/api/perfil"));
    expect(resposta.headers.get("location")).toBeNull();
  });
});
