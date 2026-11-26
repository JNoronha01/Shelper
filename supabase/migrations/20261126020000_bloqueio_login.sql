-- Bloqueio por tentativas de login erradas: 5 erros seguidos no mesmo e-mail bloqueiam
-- esse e-mail por 15 minutos (recomendação da OWASP). Só acrescenta uma tabela e três funções.
--
-- O e-mail é guardado como hash SHA-256, não em texto: a tabela não serve como lista de e-mails.
-- A tabela não tem política de RLS: ninguém lê nem escreve nela direto, só pelas funções abaixo.

create table if not exists public.tentativas_login (
  chave text primary key,          -- sha256 do e-mail em minúsculas
  falhas smallint not null default 0,
  ultima_em timestamptz not null default now(),
  bloqueado_ate timestamptz
);
alter table public.tentativas_login enable row level security;
revoke all on public.tentativas_login from anon, authenticated;

create or replace function public.chave_login(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(lower(trim(p_email)), 'UTF8')), 'hex');
$$;

-- Segundos que faltam para o e-mail poder tentar de novo (0 = liberado).
create or replace function public.login_bloqueado(p_email text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(greatest(0, ceil(extract(epoch from (bloqueado_ate - now()))))::integer, 0)
  from public.tentativas_login
  where chave = public.chave_login(p_email)
  union all select 0
  limit 1;
$$;

-- Conta um erro. Devolve quantas tentativas ainda restam e, se bloqueou, os segundos de bloqueio.
-- Erros com mais de 15 minutos de intervalo recomeçam a contagem.
create or replace function public.login_falhou(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chave text := public.chave_login(p_email);
  v record;
begin
  if p_email is null or length(p_email) > 254 then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  -- Limpeza: linhas paradas há mais de um dia não servem para nada.
  delete from public.tentativas_login where ultima_em < now() - interval '1 day';

  insert into public.tentativas_login as t (chave, falhas, ultima_em)
  values (v_chave, 1, now())
  on conflict (chave) do update set
    falhas = case
      when t.bloqueado_ate is not null and t.bloqueado_ate > now() then t.falhas
      when t.ultima_em < now() - interval '15 minutes' or t.bloqueado_ate is not null then 1
      else t.falhas + 1
    end,
    bloqueado_ate = case when t.bloqueado_ate is not null and t.bloqueado_ate <= now() then null else t.bloqueado_ate end,
    ultima_em = now()
  returning * into v;

  if v.falhas >= 5 and v.bloqueado_ate is null then
    update public.tentativas_login set bloqueado_ate = now() + interval '15 minutes' where chave = v_chave
    returning * into v;
  end if;

  return jsonb_build_object(
    'restantes', greatest(0, 5 - v.falhas),
    'segundos', coalesce(greatest(0, ceil(extract(epoch from (v.bloqueado_ate - now()))))::integer, 0)
  );
end;
$$;

-- Entrou certo: zera a contagem do próprio e-mail (só quem está logado, e só o dele).
create or replace function public.login_ok()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tentativas_login
  where chave = public.chave_login((select email from auth.users where id = auth.uid()))
    and (bloqueado_ate is null or bloqueado_ate <= now());
$$;

revoke all on function public.chave_login(text) from public;
revoke all on function public.login_bloqueado(text) from public;
revoke all on function public.login_falhou(text) from public;
revoke all on function public.login_ok() from public, anon;
grant execute on function public.login_bloqueado(text) to anon, authenticated;
grant execute on function public.login_falhou(text) to anon, authenticated;
grant execute on function public.login_ok() to authenticated;
