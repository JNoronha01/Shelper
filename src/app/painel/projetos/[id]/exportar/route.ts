import { NextResponse, type NextRequest } from "next/server";
import { obterUsuario } from "@/lib/auth/usuario";
import { carregarBoard, carregarEventosParaCalculo } from "@/lib/board/dados";
import { basicoCsv, cartoesCsv, completoJson, movimentosCsv, nomeDoArquivo, type DadosExportacao } from "@/lib/exportacao/exportar";

// Download dos arquivos da seção Exportar. Lê com a sessão de quem pediu: o RLS do banco só
// devolve projetos do time dessa pessoa (outro projeto dá 404, como na página).
const TIPOS = {
  cartoes: { gerar: cartoesCsv, extensao: "csv", tipo: "text/csv; charset=utf-8" },
  movimentos: { gerar: movimentosCsv, extensao: "csv", tipo: "text/csv; charset=utf-8" },
  basico: { gerar: basicoCsv, extensao: "csv", tipo: "text/csv; charset=utf-8" },
  completo: { gerar: completoJson, extensao: "json", tipo: "application/json; charset=utf-8" },
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: RouteContext<"/painel/projetos/[id]/exportar">) {
  const { id } = await params;
  const tipo = request.nextUrl.searchParams.get("tipo") ?? "";
  if (!UUID.test(id) || !(tipo in TIPOS)) return new NextResponse("Arquivo inválido.", { status: 400 });
  const usuario = await obterUsuario();
  if (!usuario) return NextResponse.redirect(new URL(`/entrar?proximo=/painel/projetos/${id}`, request.url));

  const board = await carregarBoard(id, usuario.id);
  if (!board) return new NextResponse("Projeto não encontrado.", { status: 404 });
  const agora = new Date().toISOString();
  const dados: DadosExportacao = {
    projeto: { id: board.projeto.id, nome: board.projeto.nome },
    cartoes: board.cartoes,
    sprints: board.sprints,
    time: board.time,
    eventos: await carregarEventosParaCalculo(id),
    geradoEm: agora,
  };
  const t = TIPOS[tipo as keyof typeof TIPOS];
  return new NextResponse(t.gerar(dados), {
    headers: {
      "Content-Type": t.tipo,
      "Content-Disposition": `attachment; filename="${nomeDoArquivo(board.projeto.nome, tipo, t.extensao, agora)}"`,
      "Cache-Control": "no-store",
    },
  });
}
