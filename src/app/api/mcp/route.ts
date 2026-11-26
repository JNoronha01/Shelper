import { responderMcp } from "@/lib/api/mcp";
import { chaveDoCabecalho } from "@/lib/api/servico";

// Servidor MCP do Shelper, com a chave no cabeçalho (Claude Code, Cursor, Claude Desktop com mcp-remote).
export async function POST(req: Request) {
  return responderMcp(req, chaveDoCabecalho(req.headers));
}
export async function GET(req: Request) {
  return responderMcp(req, null);
}
