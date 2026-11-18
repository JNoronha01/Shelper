-- Sprints com datas e Meta (H5) e metas das métricas (Aba Métricas).
-- Migração ADITIVA: só cria tabela, colunas e funções novas. Nada é renomeado nem removido,
-- então a versão congelada (branch sprint-1) continua funcionando com o mesmo banco.
--
-- Regras: uma Sprint ativa por vez; qualquer membro cria e altera Sprint e metas;
-- toda gravação passa pelas funções abaixo (mesmo padrão do board).

-- ---------------------------------------------------------------- tabelas e colunas

create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  numero integer not null check (numero >= 1),
  inicio date not null,
  fim date not null,
  meta text check (meta is null or char_length(meta) <= 300),
  encerrada boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (projeto_id, numero),
  check (fim >= inicio)
);
-- No máximo UMA Sprint não encerrada por projeto.
create unique index if not exists sprints_uma_ativa_idx on public.sprints (projeto_id) where not encerrada;

-- A coluna cartoes.sprint_id já existia sem chave estrangeira (H2); agora ela ganha a tabela.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cartoes_sprint_fk') then
    alter table public.cartoes
      add constraint cartoes_sprint_fk foreign key (sprint_id) references public.sprints (id) on delete set null;
  end if;
end $$;

-- Metas das métricas, digitadas pelo time. Todas opcionais.
alter table public.projetos add column if not exists meta_lead_dias numeric(5, 1) check (meta_lead_dias is null or meta_lead_dias > 0);
alter table public.projetos add column if not exists meta_cycle_horas numeric(6, 1) check (meta_cycle_horas is null or meta_cycle_horas > 0);
alter table public.projetos add column if not exists meta_velocity integer check (meta_velocity is null or meta_velocity > 0);

-- ---------------------------------------------------------------- RLS (somente leitura)

alter table public.sprints enable row level security;
drop policy if exists "sprints: membros leem" on public.sprints;
create policy "sprints: membros leem" on public.sprints
  for select to authenticated using (public.eh_membro(projeto_id));

-- ---------------------------------------------------------------- funções

-- Move cartões do Backlog para "A fazer", ligando-os à Sprint, e grava um evento por cartão.
-- Cartões que não são do projeto ou não estão no Backlog são ignorados. Devolve quantos entraram.
create or replace function public.puxar_cartoes_para_sprint(p_sprint uuid, p_cartoes uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_projeto uuid;
  v_n integer := 0;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id into v_projeto from public.sprints where id = p_sprint;
  if v_projeto is null or not public.eh_membro(v_projeto) then
    raise exception 'Você não tem acesso a esta Sprint.' using errcode = '42501';
  end if;
  if p_cartoes is null or coalesce(array_length(p_cartoes, 1), 0) = 0 then
    return 0;
  end if;

  with movidos as (
    update public.cartoes
       set coluna_atual = 'A fazer', sprint_id = p_sprint
     where id = any (p_cartoes) and projeto_id = v_projeto and coluna_atual = 'Backlog'
    returning id
  ), gravados as (
    insert into public.eventos (cartao_id, de_coluna, para_coluna, usuario_id, acima_do_wip)
    select id, 'Backlog', 'A fazer', v_usuario, false from movidos
    returning 1
  )
  select count(*) into v_n from gravados;
  return v_n;
end;
$$;

create or replace function public.validar_sprint(p_inicio date, p_fim date, p_meta text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_meta text := nullif(btrim(coalesce(p_meta, '')), '');
begin
  if p_inicio is null or p_fim is null then
    raise exception 'Informe a data de início e a de fim da Sprint.' using errcode = '22023';
  end if;
  if p_fim < p_inicio then
    raise exception 'A data de fim não pode ser antes da data de início.' using errcode = '22023';
  end if;
  if v_meta is not null and char_length(v_meta) > 300 then
    raise exception 'A Meta pode ter no máximo 300 caracteres.' using errcode = '22023';
  end if;
  return v_meta;
end;
$$;

create or replace function public.criar_sprint(
  p_projeto uuid, p_inicio date, p_fim date, p_meta text, p_cartoes uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_meta text;
  v_numero integer;
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_membro(p_projeto) then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  v_meta := public.validar_sprint(p_inicio, p_fim, p_meta);

  -- Trava o projeto: duas pessoas criando Sprint ao mesmo tempo não geram duas ativas.
  perform 1 from public.projetos where id = p_projeto for update;
  if exists (select 1 from public.sprints where projeto_id = p_projeto and not encerrada) then
    raise exception 'Já existe uma Sprint ativa. Encerre-a antes de criar outra.' using errcode = '22023';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero from public.sprints where projeto_id = p_projeto;
  insert into public.sprints (projeto_id, numero, inicio, fim, meta)
  values (p_projeto, v_numero, p_inicio, p_fim, v_meta)
  returning id into v_id;

  perform public.puxar_cartoes_para_sprint(v_id, p_cartoes);
  return v_id;
end;
$$;

create or replace function public.editar_sprint(p_sprint uuid, p_inicio date, p_fim date, p_meta text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projeto uuid;
  v_meta text;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id into v_projeto from public.sprints where id = p_sprint;
  if v_projeto is null or not public.eh_membro(v_projeto) then
    raise exception 'Você não tem acesso a esta Sprint.' using errcode = '42501';
  end if;
  v_meta := public.validar_sprint(p_inicio, p_fim, p_meta);
  update public.sprints set inicio = p_inicio, fim = p_fim, meta = v_meta where id = p_sprint;
end;
$$;

create or replace function public.encerrar_sprint(p_sprint uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projeto uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id into v_projeto from public.sprints where id = p_sprint;
  if v_projeto is null or not public.eh_membro(v_projeto) then
    raise exception 'Você não tem acesso a esta Sprint.' using errcode = '42501';
  end if;
  update public.sprints set encerrada = true where id = p_sprint;
end;
$$;

create or replace function public.definir_metas(
  p_projeto uuid, p_lead numeric, p_cycle numeric, p_velocity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_membro(p_projeto) then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  if (p_lead is not null and p_lead <= 0) or (p_cycle is not null and p_cycle <= 0)
     or (p_velocity is not null and p_velocity <= 0) then
    raise exception 'As metas devem ser números maiores que zero (ou ficar em branco).' using errcode = '22023';
  end if;
  update public.projetos
     set meta_lead_dias = p_lead, meta_cycle_horas = p_cycle, meta_velocity = p_velocity
   where id = p_projeto;
end;
$$;

-- ---------------------------------------------------------------- permissões

revoke execute on function public.puxar_cartoes_para_sprint(uuid, uuid[]) from public, anon;
revoke execute on function public.validar_sprint(date, date, text) from public, anon;
revoke execute on function public.criar_sprint(uuid, date, date, text, uuid[]) from public, anon;
revoke execute on function public.editar_sprint(uuid, date, date, text) from public, anon;
revoke execute on function public.encerrar_sprint(uuid) from public, anon;
revoke execute on function public.definir_metas(uuid, numeric, numeric, integer) from public, anon;
grant execute on function public.puxar_cartoes_para_sprint(uuid, uuid[]) to authenticated;
grant execute on function public.validar_sprint(date, date, text) to authenticated;
grant execute on function public.criar_sprint(uuid, date, date, text, uuid[]) to authenticated;
grant execute on function public.editar_sprint(uuid, date, date, text) to authenticated;
grant execute on function public.encerrar_sprint(uuid) to authenticated;
grant execute on function public.definir_metas(uuid, numeric, numeric, integer) to authenticated;
