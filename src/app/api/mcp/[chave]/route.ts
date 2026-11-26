import { responderMcp } from "@/lib/api/mcp";
import { FORMATO_CHAVE } from "@/lib/api/servico";

// Mesmo servidor MCP, com a chave no endereço: para os conectores do claude.ai e do ChatGPT,
// que não deixam configurar cabeçalho. Trate esse endereço como senha.
export async function POST(req: Request, { params }: RouteContext<"/api/mcp/[chave]">) {
  const { chave } = await params;
  return responderMcp(req, FORMATO_CHAVE.test(chave) ? chave : null);
}
export async function GET(req: Request) {
  return responderMcp(req, null);
}
