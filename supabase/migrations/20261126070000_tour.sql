-- Tour de primeiro acesso (H45): guarda na conta quando a pessoa viu cada tour,
-- para ele aparecer uma vez só, em qualquer computador. Só aditiva.
-- tour_painel_em: tour da tela Meus projetos. tour_projeto_em: tour do primeiro projeto aberto.
-- Nulo = ainda não viu (inclusive quem já tinha conta antes desta migração).

alter table public.perfis add column if not exists tour_painel_em timestamptz;
alter table public.perfis add column if not exists tour_projeto_em timestamptz;

create or replace function public.marcar_tour(p_qual text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if p_qual = 'painel' then
    update public.perfis set tour_painel_em = now() where id = v_usuario;
  elsif p_qual = 'projeto' then
    update public.perfis set tour_projeto_em = now() where id = v_usuario;
  else
    raise exception 'Tour desconhecido: use painel ou projeto.' using errcode = '22023';
  end if;
end;
$$;

-- "Refazer o tour" em Meu perfil: os dois tours voltam a aparecer.
create or replace function public.refazer_tour()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  update public.perfis set tour_painel_em = null, tour_projeto_em = null where id = v_usuario;
end;
$$;

revoke all on function public.marcar_tour(text) from public, anon;
revoke all on function public.refazer_tour() from public, anon;
grant execute on function public.marcar_tour(text) to authenticated;
grant execute on function public.refazer_tour() to authenticated;
