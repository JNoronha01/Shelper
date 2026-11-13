-- H1 — Cadastro e Login
-- Perfil público de cada usuário do Supabase Auth. As senhas ficam apenas em
-- auth.users, com hash bcrypt gerado pelo próprio Supabase Auth.
-- Migração aditiva: não altera nem remove dados existentes.

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 120),
  email text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Cada usuário autenticado lê apenas o próprio perfil. Sem políticas de
-- insert/update/delete: o perfil é criado pelo gatilho abaixo.
drop policy if exists "perfis: leitura do próprio perfil" on public.perfis;
create policy "perfis: leitura do próprio perfil"
  on public.perfis
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

revoke execute on function public.criar_perfil_do_usuario() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario_criar_perfil on auth.users;
create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();
