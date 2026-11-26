-- Mensagens da página "Entre em contato". Qualquer pessoa (logada ou não) envia; ninguém lê pelo
-- site: o time vê as mensagens no Supabase (Table Editor → contatos). Só acrescenta.
--
-- Para evitar spam: no máximo 3 mensagens por e-mail por hora e 30 no total por hora.

create table if not exists public.contatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  assunto text not null check (assunto in ('duvida', 'problema', 'sugestao', 'outro')),
  mensagem text not null check (char_length(mensagem) between 10 and 2000),
  usuario_id uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.contatos enable row level security;
revoke all on public.contatos from anon, authenticated;
create index if not exists contatos_email_hora on public.contatos (email, criado_em);

create or replace function public.enviar_contato(p_nome text, p_email text, p_assunto text, p_mensagem text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Informe um e-mail válido.' using errcode = '22023';
  end if;
  if (select count(*) from public.contatos where email = v_email and criado_em > now() - interval '1 hour') >= 3
     or (select count(*) from public.contatos where criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'Muitas mensagens em pouco tempo. Tente de novo mais tarde.' using errcode = '22023';
  end if;
  insert into public.contatos (nome, email, assunto, mensagem, usuario_id)
  values (trim(p_nome), v_email, p_assunto, trim(p_mensagem), auth.uid());
end;
$$;

revoke all on function public.enviar_contato(text, text, text, text) from public;
grant execute on function public.enviar_contato(text, text, text, text) to anon, authenticated;
