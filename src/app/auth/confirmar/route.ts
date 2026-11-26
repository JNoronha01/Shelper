import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ROTA_ENTRADA, ROTA_ESQUECI, ROTA_INTERNA, ROTA_REDEFINIR } from "@/lib/auth/rotas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Destino dos links enviados pelo Supabase: confirmação do cadastro e "esqueci minha senha".
// Aceita o fluxo PKCE padrão (?code=) e o modelo de e-mail com ?token_hash=&type=.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const codigo = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const supabase = await criarClienteServidor();
  let confirmado = false;
  if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    confirmado = !error;
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    confirmado = !error;
  }

  // Link de nova senha: vai para a tela de nova senha (o modelo com token_hash manda type=recovery;
  // o padrão PKCE manda ?proximo=/painel/nova-senha, que vem do pedirNovaSenha).
  const recuperacao = tipo === "recovery" || searchParams.get("proximo") === ROTA_REDEFINIR;
  const destino = confirmado
    ? recuperacao
      ? ROTA_REDEFINIR
      : ROTA_INTERNA
    : recuperacao
      ? `${ROTA_ESQUECI}?erro=link`
      : `${ROTA_ENTRADA}?erro=confirmacao`;
  return NextResponse.redirect(new URL(destino, request.url));
}
