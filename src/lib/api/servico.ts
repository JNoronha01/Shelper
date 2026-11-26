import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { COLUNAS } from "@/lib/colunas";
import { configSupabase } from "@/lib/supabase/config";
import { ErroApi, listarCartoes, metricasDoProjeto, resumoDoProjeto, verCartao, type DadosApi, type FiltroCartoes } from "./visoes";

// Operações da API, usadas pelo REST (/api/v1) e pelo MCP (/api/mcp).
// Não há sessão de navegador: cada chamada leva a chave, e o banco (api_dados / api_executar)
// confere a chave e age como quem a criou. O cliente usa só a chave publicável do Supabase.

export const FORMATO_CHAVE = /^shp_[0-9a-f]{64}$/;

// "Authorization: Bearer shp_...", "Authorization: shp_..." (sem o Bearer) ou "X-Api-Key: shp_...".
// Aceita as três formas porque cada IA pede o cabeçalho de um jeito e é fácil esquecer o "Bearer".
export function chaveDoCabecalho(cabecalhos: Headers): string | null {
  for (const valor of [cabecalhos.get("authorization"), cabecalhos.get("x-api-key")]) {
    const chave = valor?.trim().replace(/^Bearer\s+/i, "").trim();
    if (chave) return chave;
  }
  return null;
}

function cliente() {
  const { url, chave } = configSupabase();
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

function erroDoBanco(e: PostgrestError): ErroApi {
  if (e.code === "28000") return new ErroApi(401, e.message);
  if (e.code === "42501") return new ErroApi(403, e.message);
  if (e.code === "22023" || e.code === "22P02" || e.code === "23514") return new ErroApi(400, e.message);
  console.error("Falha na API", { code: e.code });
  return new ErroApi(500, "Não foi possível concluir agora. Tente de novo em instantes.");
}

async function dados(chave: string): Promise<DadosApi> {
  if (!FORMATO_CHAVE.test(chave)) throw new ErroApi(401, "Chave da API ausente ou em formato inválido.");
  const { data, error } = await cliente().rpc("api_dados", { p_chave: chave });
  if (error) throw erroDoBanco(error);
  return data as DadosApi;
}

async function executar(chave: string, acao: string, args: Record<string, unknown>) {
  if (!FORMATO_CHAVE.test(chave)) throw new ErroApi(401, "Chave da API ausente ou em formato inválido.");
  const { data, error } = await cliente().rpc("api_executar", { p_chave: chave, p_acao: acao, p_args: args });
  if (error) throw erroDoBanco(error);
  return data as {
    status: string;
    id?: string;
    item?: string;
    acima_do_wip?: boolean;
    coluna?: string;
    limite?: number;
    ocupados?: number;
  };
}

// Resposta de quando a coluna está no limite de WIP: nada mudou, e a IA precisa confirmar.
function respostaWip(r: { coluna?: string; limite?: number; ocupados?: number }) {
  return {
    ok: false,
    motivo: "limite_wip",
    mensagem: `A coluna ${r.coluna} está no limite de WIP (${r.ocupados}/${r.limite}). Nada foi alterado. Para passar do limite mesmo assim, repita com confirmar_wip: true.`,
  };
}

const texto = (v: unknown) => (typeof v === "string" ? v : undefined);

export const operacoes = {
  async projeto(chave: string) {
    return resumoDoProjeto(await dados(chave));
  },
  async cartoes(chave: string, filtro: FiltroCartoes) {
    const lista = listarCartoes(await dados(chave), filtro);
    return { total: lista.length, cartoes: lista };
  },
  async cartao(chave: string, id: string) {
    const d = await dados(chave);
    const c = d.cartoes.find((x) => x.id === id);
    if (!c) throw new ErroApi(404, "Cartão não encontrado neste projeto.");
    return verCartao(d, c);
  },
  async metricas(chave: string, sprint: string | null | undefined) {
    return metricasDoProjeto(await dados(chave), sprint, new Date().toISOString());
  },
  async criarCartao(chave: string, a: Record<string, unknown>) {
    if (!texto(a.titulo)?.trim()) throw new ErroApi(400, "Informe o título do cartão.");
    if (a.coluna !== undefined && !(COLUNAS as readonly unknown[]).includes(a.coluna)) {
      throw new ErroApi(400, `Coluna inválida. Use uma destas: ${COLUNAS.join(", ")}.`);
    }
    const r = await executar(
      chave,
      "criar_cartao",
      limpar(a, ["titulo", "pontos", "coluna", "descricao", "horas", "responsavel", "confirmar_wip"]),
    );
    if (r.status === "wip") return respostaWip(r);
    return { ok: true, id: r.id, acima_do_wip: r.acima_do_wip === true };
  },
  async moverCartao(chave: string, id: string, a: Record<string, unknown>) {
    if (!(COLUNAS as readonly unknown[]).includes(a.coluna))
      throw new ErroApi(400, `Coluna inválida. Use uma destas: ${COLUNAS.join(", ")}.`);
    const r = await executar(chave, "mover_cartao", { cartao: id, coluna: a.coluna, confirmar_wip: a.confirmar_wip === true });
    if (r.status === "wip") return respostaWip(r);
    if (r.status === "sem_mudanca") return { ok: true, mensagem: "O cartão já estava nessa coluna." };
    return { ok: true, acima_do_wip: r.acima_do_wip === true };
  },
  async editarCartao(chave: string, id: string, a: Record<string, unknown>) {
    const campos = limpar(a, ["titulo", "pontos", "horas", "descricao", "responsavel"]);
    if (Object.keys(campos).length === 0)
      throw new ErroApi(400, "Nada para alterar. Envie titulo, pontos, horas, descricao ou responsavel.");
    await executar(chave, "editar_cartao", { ...campos, cartao: id });
    return { ok: true };
  },
  async adicionarChecklist(chave: string, id: string, a: Record<string, unknown>) {
    if (!texto(a.texto)?.trim()) throw new ErroApi(400, "Informe o texto do item.");
    const r = await executar(chave, "adicionar_checklist", { cartao: id, texto: a.texto });
    return { ok: true, item: r.item };
  },
  async marcarChecklist(chave: string, id: string, item: string, a: Record<string, unknown>) {
    await executar(chave, "marcar_checklist", { cartao: id, item, feito: a.feito !== false });
    return { ok: true };
  },
};

// Só os campos conhecidos, sem os undefined (o banco diferencia "não mandou" de "mandou vazio").
function limpar(a: Record<string, unknown>, permitidos: string[]) {
  return Object.fromEntries(permitidos.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]));
}
