import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { OPCOES_COOKIE, configSupabase } from "./config";

// Cliente para Server Components, Server Actions e Route Handlers.
// A sessão vive em cookies httpOnly gerenciados pelo @supabase/ssr.
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  const { url, chave } = configSupabase();

  return createServerClient(url, chave, {
    cookieOptions: OPCOES_COOKIE,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão
          // antes da renderização, então ignorar aqui é seguro.
        }
      },
    },
  });
}
