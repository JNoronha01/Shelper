import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApi, listarCartoes, metricasDoProjeto, resumoDoProjeto, type DadosApi } from "./visoes";

const rpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
vi.mock("@/lib/supabase/config", () => ({ configSupabase: () => ({ url: "http://x", chave: "y" }) }));

const { responderMcp } = await import("./mcp");
const { responderRest } = await import("./rest");

const CHAVE = "shp_" + "a".repeat(64);
const C1 = "11111111-1111-4111-8111-111111111111";

const dados: DadosApi = {
  eu: { id: "u1", nome: "Jorge", funcao: "po" },
  projeto: {
    id: "p",
    nome: "Shelper",
    wip_andamento: 3,
    wip_revisao: 2,
    meta_lead_dias: 4,
    meta_cycle_horas: null,
    meta_velocity: null,
    cliente: null,
    objetivo: null,
    data_inicio: null,
    data_entrega: null,
  },
  sprints: [
    { id: "s1", numero: 1, inicio: "2026-11-10", fim: "2026-11-17", meta: "MVP", encerrada: true },
    { id: "s2", numero: 2, inicio: "2026-11-17", fim: "2026-11-24", meta: null, encerrada: false },
  ],
  time: [
    { id: "u1", nome: "Jorge", funcao: "po" },
    { id: "u2", nome: "Giovanni", funcao: "dev" },
  ],
  cartoes: [
    {
      id: C1,
      titulo: "H1 - Login",
      pontos: 3,
      coluna: "Concluído",
      criado_em: "2026-11-10T12:00:00Z",
      sprint_id: "s1",
      descricao: null,
      responsavel_id: "u2",
      horas_estimadas: 4,
      bloqueado: false,
      motivo_bloqueio: null,
      checklist: [],
    },
    {
      id: "c2",
      titulo: "H2 - Perfil",
      pontos: 5,
      coluna: "Em andamento",
      criado_em: "2026-11-17T12:00:00Z",
      sprint_id: "s2",
      descricao: "foto",
      responsavel_id: null,
      horas_estimadas: null,
      bloqueado: true,
      motivo_bloqueio: "API",
      checklist: [],
    },
  ],
  eventos: [
    { cartao_id: C1, de: null, para: "A fazer", em: "2026-11-10T12:00:00Z" },
    { cartao_id: C1, de: "A fazer", para: "Em andamento", em: "2026-11-11T12:00:00Z" },
    { cartao_id: C1, de: "Em andamento", para: "Concluído", em: "2026-11-12T12:00:00Z" },
    { cartao_id: "c2", de: null, para: "Em andamento", em: "2026-11-18T12:00:00Z" },
  ],
};

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (nome: string) =>
    nome === "api_dados" ? { data: dados, error: null } : { data: { status: "ok" }, error: null },
  );
});

describe("visões da API", () => {
  it("resumo: colunas, Sprint ativa, papel e bloqueados", () => {
    const r = resumoDoProjeto(dados);
    expect(r.voce.papel).toBe("Product Owner");
    expect(r.sprint_ativa?.numero).toBe(2);
    expect(r.colunas["Concluído"]).toEqual({ cartoes: 1, pontos: 3 });
    expect(r.bloqueados).toEqual([{ id: "c2", titulo: "H2 - Perfil", motivo: "API" }]);
  });

  it("filtros de cartões por Sprint, responsável e busca", () => {
    expect(listarCartoes(dados, { sprint: "ativa" }).map((c) => c.id)).toEqual(["c2"]);
    expect(listarCartoes(dados, { sprint: "1" }).map((c) => c.id)).toEqual([C1]);
    expect(listarCartoes(dados, { responsavel: "giov" })[0].responsavel).toEqual({ id: "u2", nome: "Giovanni" });
    expect(listarCartoes(dados, { busca: "FOTO" }).map((c) => c.id)).toEqual(["c2"]);
    expect(() => listarCartoes(dados, { coluna: "Pronto" })).toThrow(ErroApi);
  });

  it("métricas do projeto e da Sprint", () => {
    const tudo = metricasDoProjeto(dados, null, "2026-11-20T12:00:00Z");
    expect(tudo).toMatchObject({ throughput: 1, velocity: 3, lead_time_medio_dias: 2, cycle_time_medio_horas: 24 });
    const s2 = metricasDoProjeto(dados, "ativa", "2026-11-20T12:00:00Z");
    expect(s2.sprint).toMatchObject({ numero: 2, pontos_planejados: 5, pontos_concluidos: 0 });
    expect(s2.sprint?.burndown[0]).toEqual({ dia: "2026-11-17", faltam: 5, ideal: 5 });
  });
});

const post = (corpo: unknown, cabecalhos: Record<string, string> = { authorization: `Bearer ${CHAVE}` }) =>
  new Request("http://x/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...cabecalhos },
    body: JSON.stringify(corpo),
  });

describe("servidor MCP", () => {
  it("initialize, tools/list e notificação", async () => {
    const ini = await (
      await responderMcp(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }), CHAVE)
    ).json();
    expect(ini.result.protocolVersion).toBe("2025-06-18");
    expect(ini.result.serverInfo.name).toBe("shelper");
    const lista = await (await responderMcp(post({ jsonrpc: "2.0", id: 2, method: "tools/list" }), CHAVE)).json();
    expect(lista.result.tools.map((t: { name: string }) => t.name)).toContain("mover_cartao");
    expect(lista.result.tools[0].rodar).toBeUndefined();
    const nota = await responderMcp(post({ jsonrpc: "2.0", method: "notifications/initialized" }), CHAVE);
    expect(nota.status).toBe(202);
  });

  it("chama ferramenta com a chave e devolve erro legível", async () => {
    const r = await (
      await responderMcp(post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "ver_projeto", arguments: {} } }), CHAVE)
    ).json();
    expect(r.result.isError).toBe(false);
    expect(r.result.structuredContent.projeto.nome).toBe("Shelper");
    expect(rpc).toHaveBeenCalledWith("api_dados", { p_chave: CHAVE });

    rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "Só o PO e o SM fazem isso." } });
    const negado = await (
      await responderMcp(
        post({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "mover_cartao", arguments: { cartao: C1, coluna: "A fazer" } },
        }),
        CHAVE,
      )
    ).json();
    expect(negado.result).toEqual({ content: [{ type: "text", text: "Só o PO e o SM fazem isso." }], isError: true });
  });

  it("chave revogada falha já na conexão", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "28000", message: "Chave da API inválida ou revogada." } });
    const r = await responderMcp(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }), CHAVE);
    expect(r.status).toBe(401);
  });

  it("sem chave responde 401; GET responde 405", async () => {
    expect((await responderMcp(post({ jsonrpc: "2.0", id: 1, method: "ping" }, {}), null)).status).toBe(401);
    expect((await responderMcp(new Request("http://x/api/mcp"), CHAVE)).status).toBe(405);
  });
});

describe("API REST", () => {
  const req = (metodo: string, url: string, corpo?: unknown, chave: string | null = CHAVE) =>
    new Request(`http://x${url}`, {
      method: metodo,
      headers: { ...(chave ? { authorization: `Bearer ${chave}` } : {}), "content-type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });

  it("lê e filtra", async () => {
    const r = await responderRest(req("GET", "/api/v1/cartoes?sprint=ativa"), ["cartoes"]);
    expect(r.status).toBe(200);
    expect((await r.json()).total).toBe(1);
  });

  it("mover no limite de WIP devolve 409 e não muda nada", async () => {
    rpc.mockResolvedValueOnce({ data: { status: "wip", coluna: "Em andamento", limite: 3, ocupados: 3 }, error: null });
    const r = await responderRest(req("POST", `/api/v1/cartoes/${C1}/mover`, { coluna: "Em andamento" }), ["cartoes", C1, "mover"]);
    expect(r.status).toBe(409);
    expect((await r.json()).mensagem).toMatch(/limite de WIP \(3\/3\)/);
    expect(rpc).toHaveBeenCalledWith("api_executar", {
      p_chave: CHAVE,
      p_acao: "mover_cartao",
      p_args: { cartao: C1, coluna: "Em andamento", confirmar_wip: false },
    });
  });

  it("sem chave 401, chave inválida 401, rota errada 404, coluna errada 400", async () => {
    expect((await responderRest(req("GET", "/api/v1/projeto", undefined, null), ["projeto"])).status).toBe(401);
    expect((await responderRest(req("GET", "/api/v1/projeto", undefined, "abc"), ["projeto"])).status).toBe(401);
    expect((await responderRest(req("DELETE", "/api/v1/projeto"), ["projeto"])).status).toBe(404);
    expect((await responderRest(req("POST", `/api/v1/cartoes/${C1}/mover`, { coluna: "Pronto" }), ["cartoes", C1, "mover"])).status).toBe(
      400,
    );
  });
});
