import { COLUNAS } from "@/lib/colunas";
import { operacoes } from "./servico";
import { ErroApi } from "./visoes";

// Servidor MCP do Shelper (Model Context Protocol, transporte "Streamable HTTP" sem sessão).
// Uma IA (Claude, Cursor, ChatGPT...) conecta em /api/mcp e passa a ter "ferramentas" para
// ler o board e as métricas e para criar, mover e editar cartões. Cada chamada usa a chave
// do projeto, então a IA age como a pessoa que gerou a chave, com o papel dela.
//
// Só JSON-RPC 2.0 por POST, com resposta em JSON (o protocolo permite não usar streaming).

export const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Ferramenta = {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  rodar: (chave: string, a: Record<string, unknown>) => Promise<unknown>;
};

const ID = { type: "string", description: "Id do cartão (uuid). Pegue em listar_cartoes." };
const COLUNA = { type: "string", enum: [...COLUNAS] };
const SPRINT = { type: "string", description: 'Sprint: "ativa", o número (ex.: "2") ou o id.' };

export const FERRAMENTAS: Ferramenta[] = [
  {
    name: "ver_projeto",
    title: "Ver o projeto",
    description:
      "Resumo do projeto no Shelper: quantos cartões e pontos há em cada coluna, a Sprint ativa, o time com os papéis, os limites de WIP, as metas e os cartões bloqueados. Comece por aqui.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    rodar: (chave) => operacoes.projeto(chave),
  },
  {
    name: "listar_cartoes",
    title: "Listar cartões",
    description: "Lista os cartões do board, com filtros opcionais. Cada cartão traz id, título, pontos, coluna, Sprint, responsável e checklist.",
    inputSchema: {
      type: "object",
      properties: {
        coluna: COLUNA,
        sprint: { type: "string", description: 'Sprint: "ativa", o número, o id, ou "nenhuma" para os cartões sem Sprint.' },
        responsavel: { type: "string", description: "Nome (ou parte) ou id da pessoa responsável." },
        busca: { type: "string", description: "Texto procurado no título e na descrição." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    rodar: (chave, a) =>
      operacoes.cartoes(chave, { coluna: str(a.coluna), sprint: str(a.sprint), responsavel: str(a.responsavel), busca: str(a.busca) }),
  },
  {
    name: "ver_cartao",
    title: "Ver um cartão",
    description: "Detalhes de um cartão: descrição, checklist (com o id de cada item), responsável, horas e bloqueio.",
    inputSchema: { type: "object", properties: { cartao: ID }, required: ["cartao"], additionalProperties: false },
    annotations: { readOnlyHint: true },
    rodar: (chave, a) => operacoes.cartao(chave, String(a.cartao)),
  },
  {
    name: "ver_metricas",
    title: "Ver métricas",
    description:
      "Lead Time, Cycle Time, Throughput, Velocity, o gargalo (coluna onde os cartões ficam mais tempo) e o tempo médio por coluna. Com uma Sprint, traz também pontos planejados e concluídos, Burndown dia a dia e números por pessoa.",
    inputSchema: { type: "object", properties: { sprint: SPRINT }, additionalProperties: false },
    annotations: { readOnlyHint: true },
    rodar: (chave, a) => operacoes.metricas(chave, str(a.sprint)),
  },
  {
    name: "criar_cartao",
    title: "Criar cartão",
    description:
      "Cria um cartão. Pontos na escala de Fibonacci (0, 1, 2, 3, 5, 8, 13, 21...). Se a coluna estiver no limite de WIP, nada é criado e a resposta explica; repita com confirmar_wip: true só se o usuário concordar.",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Até 200 caracteres. Ex.: H46 - Exportar relatório" },
        pontos: { type: "integer", enum: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] },
        coluna: { ...COLUNA, description: "Padrão: Backlog." },
        descricao: { type: "string" },
        horas: { type: "number", description: "Horas estimadas (0,5 a 1000)." },
        responsavel: { type: "string", description: "Id da pessoa (veja ver_projeto). Exige horas." },
        confirmar_wip: { type: "boolean" },
      },
      required: ["titulo"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    rodar: (chave, a) => operacoes.criarCartao(chave, a),
  },
  {
    name: "mover_cartao",
    title: "Mover cartão",
    description:
      "Move um cartão para outra coluna. O Shelper grava o movimento com a hora do servidor (é o que alimenta as métricas). Respeita o limite de WIP: se a coluna estiver cheia, nada muda e a resposta explica; só repita com confirmar_wip: true se o usuário concordar.",
    inputSchema: {
      type: "object",
      properties: { cartao: ID, coluna: COLUNA, confirmar_wip: { type: "boolean" } },
      required: ["cartao", "coluna"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    rodar: (chave, a) => operacoes.moverCartao(chave, String(a.cartao), a),
  },
  {
    name: "editar_cartao",
    title: "Editar cartão",
    description: "Altera título, pontos, horas estimadas, descrição ou responsável de um cartão. Mande só o que muda.",
    inputSchema: {
      type: "object",
      properties: {
        cartao: ID,
        titulo: { type: "string" },
        pontos: { type: "integer", enum: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] },
        horas: { type: "number" },
        descricao: { type: "string" },
        responsavel: { type: ["string", "null"], description: "Id da pessoa, ou null para tirar o responsável." },
      },
      required: ["cartao"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    rodar: (chave, a) => {
      const { cartao, ...resto } = a;
      return operacoes.editarCartao(chave, String(cartao), resto);
    },
  },
  {
    name: "adicionar_item_checklist",
    title: "Adicionar item ao checklist",
    description: "Adiciona um item (critério de aceite ou tarefa) ao checklist de um cartão.",
    inputSchema: {
      type: "object",
      properties: { cartao: ID, texto: { type: "string", description: "Até 200 caracteres." } },
      required: ["cartao", "texto"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    rodar: (chave, a) => operacoes.adicionarChecklist(chave, String(a.cartao), a),
  },
  {
    name: "marcar_item_checklist",
    title: "Marcar item do checklist",
    description: "Marca (ou desmarca) um item do checklist como feito. O id do item vem em ver_cartao.",
    inputSchema: {
      type: "object",
      properties: { cartao: ID, item: { type: "string", description: "Id do item (uuid)." }, feito: { type: "boolean", description: "Padrão: true." } },
      required: ["cartao", "item"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    rodar: (chave, a) => operacoes.marcarChecklist(chave, String(a.cartao), String(a.item), a),
  },
];

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

const INSTRUCOES =
  "Shelper é um board Kanban/Scrum com métricas automáticas. Colunas: Backlog → A fazer → Em andamento → Em revisão → Concluído. " +
  "Use ver_projeto para se situar e listar_cartoes para achar ids. Você age com o papel de quem criou a chave (Product Owner, Scrum Master ou Desenvolvedor). " +
  "Antes de passar de um limite de WIP (confirmar_wip), pergunte ao usuário.";

type Pedido = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
type Resposta = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

async function atender(p: Pedido, chave: string): Promise<Resposta | null> {
  const id = p.id ?? null;
  const ok = (result: unknown): Resposta => ({ jsonrpc: "2.0", id, result });
  const falha = (code: number, message: string): Resposta => ({ jsonrpc: "2.0", id, error: { code, message } });
  if (p.jsonrpc !== "2.0" || typeof p.method !== "string") return falha(-32600, "Pedido JSON-RPC inválido.");
  // Notificação (sem id): não tem resposta.
  if (p.id === undefined) return null;

  switch (p.method) {
    case "initialize": {
      const pedida = String(p.params?.protocolVersion ?? "");
      return ok({
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "shelper", title: "Shelper", version: "1.0.0" },
        instructions: INSTRUCOES,
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: FERRAMENTAS.map(({ rodar: _rodar, ...f }) => f) });
    case "tools/call": {
      const nome = String(p.params?.name ?? "");
      const f = FERRAMENTAS.find((x) => x.name === nome);
      if (!f) return falha(-32602, `Ferramenta desconhecida: ${nome}`);
      const args = (p.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const r = await f.rodar(chave, typeof args === "object" && args ? args : {});
        const erroDeNegocio = typeof r === "object" && r !== null && (r as { ok?: boolean }).ok === false;
        return ok({
          content: [{ type: "text", text: JSON.stringify(r, null, 2) }],
          structuredContent: r,
          isError: erroDeNegocio,
        });
      } catch (e) {
        // Erro da ferramenta volta como resultado com isError, para a IA ler e corrigir.
        const msg = e instanceof ErroApi ? e.message : "Erro inesperado no Shelper.";
        if (!(e instanceof ErroApi)) console.error("Erro no MCP", e);
        return ok({ content: [{ type: "text", text: msg }], isError: true });
      }
    }
    default:
      return falha(-32601, `Método não suportado: ${p.method}`);
  }
}

export async function responderMcp(req: Request, chave: string | null): Promise<Response> {
  const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: { "Cache-Control": "no-store" } });
  if (req.method !== "POST") {
    return new Response("Este servidor MCP aceita só POST (Streamable HTTP, sem SSE).", { status: 405, headers: { Allow: "POST" } });
  }
  if (!chave) {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Envie a chave do Shelper (Authorization: Bearer shp_...)." } }, 401);
  }
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido." } }, 400);
  }
  const pedidos = Array.isArray(corpo) ? corpo : [corpo];
  if (pedidos.length === 0 || pedidos.length > 20) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Lote vazio ou grande demais." } }, 400);
  const respostas = (await Promise.all(pedidos.map((p) => atender((p ?? {}) as Pedido, chave)))).filter((r): r is Resposta => r !== null);
  // Só notificações: 202 sem corpo, como o protocolo pede.
  if (respostas.length === 0) return new Response(null, { status: 202 });
  return json(Array.isArray(corpo) ? respostas : respostas[0]);
}
