import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const consulta = { eq: vi.fn(), maybeSingle: vi.fn() };
const from = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  criarClienteServidor: async () => ({ auth: { getUser }, from }),
}));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ select: () => consulta });
  consulta.eq.mockReturnValue(consulta);
});

describe("GET /api/perfil", () => {
  it("responde 401 sem sessão e não consulta o banco", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const resposta = await GET();
    expect(resposta.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("consulta apenas o perfil do usuário da sessão", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "usuario-a" } } });
    const perfil = { id: "usuario-a", nome: "Ana", email: "ana@exemplo.com", criado_em: "2026-11-13" };
    consulta.maybeSingle.mockResolvedValue({ data: perfil, error: null });

    const resposta = await GET();
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual(perfil);
    expect(from).toHaveBeenCalledWith("perfis");
    expect(consulta.eq).toHaveBeenCalledWith("id", "usuario-a");
  });
});
