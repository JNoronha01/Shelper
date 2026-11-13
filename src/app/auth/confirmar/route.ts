import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ROTA_ENTRADA, ROTA_INTERNA } from "@/lib/auth/rotas";
import { criarClienteServidor } from "@/lib/supabase/server";

// Destino do link de confirmação enviado pelo Supabase após o cadastro.
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

  const destino = confirmado ? ROTA_INTERNA : `${ROTA_ENTRADA}?erro=confirmacao`;
  return NextResponse.redirect(new URL(destino, request.url));
}
