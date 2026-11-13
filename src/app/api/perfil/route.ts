import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

// Perfil do usuário autenticado. A consulta filtra pelo id da sessão e, no banco,
// a política de RLS de "perfis" impede ler o perfil de outra pessoa.
export async function GET() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("id, nome, email, criado_em")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Falha ao ler perfil", { code: error.code });
    return NextResponse.json({ erro: "Não foi possível carregar o perfil." }, { status: 500 });
  }
  if (!perfil) {
    return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });
  }
  return NextResponse.json(perfil, { headers: { "cache-control": "private, no-store" } });
}
