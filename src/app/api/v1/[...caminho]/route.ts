import { responderRest } from "@/lib/api/rest";

// API REST do Shelper. As rotas e as regras estão em src/lib/api/rest.ts; a documentação, em /api.
type Contexto = RouteContext<"/api/v1/[...caminho]">;

export async function GET(req: Request, { params }: Contexto) {
  return responderRest(req, (await params).caminho);
}
export async function POST(req: Request, { params }: Contexto) {
  return responderRest(req, (await params).caminho);
}
export async function PATCH(req: Request, { params }: Contexto) {
  return responderRest(req, (await params).caminho);
}
