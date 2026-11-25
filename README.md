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
   Depois rode, nesta ordem, `20261117000000_board.sql`, `20261118000000_sprints_metas.sql`
   (Sprints e metas), `20261118170000_seguranca_rls_auto_enable.sql` e
   `20261119000000_ideias_professor.sql` (pop-ups, detalhe do cartão, Fibonacci 0–89,
   convite e Planning Poker) e `20261124000000_papeis_cadastro.sql` (papéis PO, SM e
   desenvolvedor, e cadastro completo do projeto), `20261124010000_cartao_gargalo.sql`
   (responsável, horas estimadas e bloqueio do cartão) `20261124020000_perfil.sql` (foto de
   perfil no Storage, edição de nome e e-mail sincronizado) e `20261126000000_importar_trello.sql`
   (importação do board a partir do JSON do Trello). **As migrações são aditivas** (criam tabelas, colunas e funções;
   nunca renomeiam nem removem dados), porque as versões antigas do site (branches `sprint-N`)
   usam o mesmo banco. A única regra que muda é a lista de pontos, que fica maior.
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
