import { chaveDoCabecalho, operacoes } from "./servico";
import { ErroApi } from "./visoes";

// API REST do Shelper (/api/v1). Rotas:
//   GET   /projeto                              resumo: colunas, Sprint ativa, time, limites e metas
//   GET   /cartoes?coluna=&sprint=&responsavel=&busca=
//   POST  /cartoes                              { titulo, pontos?, coluna?, descricao?, horas?, responsavel?, confirmar_wip? }
//   GET   /cartoes/{id}
//   PATCH /cartoes/{id}                         { titulo?, pontos?, horas?, descricao?, responsavel? }
//   POST  /cartoes/{id}/mover                   { coluna, confirmar_wip? }
//   POST  /cartoes/{id}/checklist               { texto }
//   PATCH /cartoes/{id}/checklist/{item}        { feito }
//   GET   /metricas?sprint=ativa|2|{id}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function corpo(req: Request): Promise<Record<string, unknown>> {
  if (!req.body) return {};
  try {
    const j = (await req.json()) as unknown;
    if (typeof j !== "object" || j === null || Array.isArray(j)) throw new Error();
    return j as Record<string, unknown>;
  } catch {
    throw new ErroApi(400, "O corpo precisa ser um objeto JSON.");
  }
}

export async function responderRest(req: Request, caminho: string[]): Promise<Response> {
  try {
    const chave = chaveDoCabecalho(req.headers);
    if (!chave) throw new ErroApi(401, "Envie a chave no cabeçalho Authorization: Bearer shp_...");
    const q = new URL(req.url).searchParams;
    const [recurso, id, sub, item] = caminho;
    const m = req.method;
    if (id !== undefined && !UUID.test(id)) throw new ErroApi(404, "Cartão não encontrado.");
    if (item !== undefined && !UUID.test(item)) throw new ErroApi(404, "Item não encontrado.");

    let r: unknown;
    let status = 200;
    if (recurso === "projeto" && !id && m === "GET") r = await operacoes.projeto(chave);
    else if (recurso === "metricas" && !id && m === "GET") r = await operacoes.metricas(chave, q.get("sprint"));
    else if (recurso === "cartoes" && !id && m === "GET")
      r = await operacoes.cartoes(chave, { coluna: q.get("coluna"), sprint: q.get("sprint"), responsavel: q.get("responsavel"), busca: q.get("busca") });
    else if (recurso === "cartoes" && !id && m === "POST") {
      r = await operacoes.criarCartao(chave, await corpo(req));
      if ((r as { ok: boolean }).ok) status = 201;
    } else if (recurso === "cartoes" && id && !sub && m === "GET") r = await operacoes.cartao(chave, id);
    else if (recurso === "cartoes" && id && !sub && m === "PATCH") r = await operacoes.editarCartao(chave, id, await corpo(req));
    else if (recurso === "cartoes" && id && sub === "mover" && !item && m === "POST") r = await operacoes.moverCartao(chave, id, await corpo(req));
    else if (recurso === "cartoes" && id && sub === "checklist" && !item && m === "POST") {
      r = await operacoes.adicionarChecklist(chave, id, await corpo(req));
      status = 201;
    } else if (recurso === "cartoes" && id && sub === "checklist" && item && m === "PATCH")
      r = await operacoes.marcarChecklist(chave, id, item, await corpo(req));
    else throw new ErroApi(404, "Rota não encontrada. Veja a documentação em /api.");

    // Limite de WIP: nada mudou, então responde 409 (conflito) com a explicação.
    if (typeof r === "object" && r && (r as { motivo?: string }).motivo === "limite_wip") status = 409;
    return Response.json(r, { status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const erro = e instanceof ErroApi ? e : new ErroApi(500, "Erro inesperado.");
    if (!(e instanceof ErroApi)) console.error("Erro na API REST", e);
    return Response.json({ erro: erro.message }, { status: erro.status, headers: { "Cache-Control": "no-store" } });
  }
}
