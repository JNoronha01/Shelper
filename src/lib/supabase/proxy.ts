import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ROTA_ENTRADA,
  ROTA_INTERNA,
  eRotaDeVisitante,
  exigeSessao,
} from "@/lib/auth/rotas";
import { OPCOES_COOKIE, configSupabase } from "./config";

// Renova os tokens da sessão (gravando cookies novos na resposta) e faz os
// redirecionamentos de acesso. As páginas e APIs verificam a sessão de novo:
// o proxy é só a primeira barreira.
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  const { url, chave } = configSupabase();
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookieOptions: OPCOES_COOKIE,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar, cabecalhos) {
        for (const { name, value } of cookiesParaGravar) {
          request.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) {
          resposta.cookies.set(name, value, options);
        }
        for (const [nome, valor] of Object.entries(cabecalhos)) {
          resposta.headers.set(nome, valor);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  if (!user && exigeSessao(caminho)) {
    const destino = new URL(ROTA_ENTRADA, request.url);
    destino.searchParams.set("proximo", `${caminho}${request.nextUrl.search}`);
    return redirecionarMantendoCookies(destino, resposta);
  }
  if (user && eRotaDeVisitante(caminho) && request.method === "GET") {
    return redirecionarMantendoCookies(new URL(ROTA_INTERNA, request.url), resposta);
  }
  return resposta;
}

function redirecionarMantendoCookies(destino: URL, origem: NextResponse): NextResponse {
  const redirecionamento = NextResponse.redirect(destino);
  for (const cookie of origem.cookies.getAll()) {
    redirecionamento.cookies.set(cookie);
  }
  const cacheControl = origem.headers.get("cache-control");
  if (cacheControl) redirecionamento.headers.set("cache-control", cacheControl);
  return redirecionamento;
}
