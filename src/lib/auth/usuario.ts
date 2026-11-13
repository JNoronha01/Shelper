import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ROTA_ENTRADA } from "./rotas";

export type Usuario = { id: string; nome: string; email: string };

function paraUsuario(user: User): Usuario {
  const nome = user.user_metadata?.nome;
  const email = user.email ?? "";
  return {
    id: user.id,
    nome: typeof nome === "string" && nome ? nome : email,
    email,
  };
}

// getUser() valida o token no servidor do Supabase Auth a cada chamada,
// então uma sessão encerrada no logout deixa de ser aceita imediatamente.
// connection() impede que essa verificação entre em algum prerender.
export async function obterUsuario(): Promise<Usuario | null> {
  await connection();
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? paraUsuario(user) : null;
}

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect(ROTA_ENTRADA);
  return usuario;
}
