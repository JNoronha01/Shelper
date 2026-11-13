import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

// A página inicial é pública e estática, por isso fica fora do proxy.
export const config = {
  matcher: ["/painel/:path*", "/entrar", "/cadastro", "/api/:path*"],
};
