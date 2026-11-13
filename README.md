# Shelper
Projeto para a nota M2, um sistema para suporte de times de métodos ágeis, visando automatizar os métodos do Scrum e reduzir tempo gasto no processo de análise do mesmo.

## Rodando localmente

Requisitos: Node 24 e um projeto no [Supabase](https://supabase.com) (o plano gratuito basta).

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API; a chave
   *anon* legada também funciona). Nunca use a chave secreta / `service_role` aqui.
3. Aplique a migração `supabase/migrations/20261113000000_perfis.sql`: cole no SQL Editor do
   Supabase ou rode `supabase db push` com a CLI. Ela só cria coisas novas (tabela `perfis`,
   política de RLS e gatilho) e pode ser executada mais de uma vez.
4. Em Authentication → URL Configuration, cadastre a URL do site (ex.: `http://localhost:3000`
   e a da Vercel) em *Site URL* / *Redirect URLs*, para o link de confirmação de e-mail voltar
   para `/auth/confirmar`.
5. `npm run dev` e abra http://localhost:3000

Na Vercel, cadastre as mesmas duas variáveis em Settings → Environment Variables.

### Autenticação

- Cadastro, login e logout usam o **Supabase Auth**; as senhas ficam só no Supabase, com hash bcrypt.
- A sessão fica em cookies `httpOnly` gerenciados por `@supabase/ssr` e é renovada em `src/proxy.ts`.
- Páginas em `/painel` exigem login (redirecionam para `/entrar`); `/api/perfil` responde 401 sem sessão.
- Com "Confirm email" ligado no Supabase (padrão), a conta só entra depois de clicar no link
  enviado por e-mail; desligado, o cadastro já entra direto no painel.

### Verificações

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build`
