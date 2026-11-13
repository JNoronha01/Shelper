// URL do projeto e chave publicável (anon) do Supabase. A chave publicável pode ir ao
// navegador: o acesso aos dados é limitado pelas políticas de RLS do banco.
export function configSupabase(): { url: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja .env.example).",
    );
  }
  return { url, chave };
}

// Toda a autenticação roda no servidor, então o navegador não precisa ler os
// cookies de sessão: httpOnly evita que scripts da página tenham acesso ao token.
export const OPCOES_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;
