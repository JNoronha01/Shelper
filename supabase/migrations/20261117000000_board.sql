-- H2, H3 e H4 — Projeto com colunas, cartões e movimentação gravando eventos.
-- Modelo de dados do Apêndice B.2 do Relatório. Migração aditiva: não altera
-- nem remove dados existentes (a tabela "perfis" do H1 continua igual).
--
-- Regras de acesso:
--   * Leitura: só quem está em "membros" do projeto (RLS em todas as tabelas).
--   * Escrita: nenhuma tabela aceita insert/update/delete direto do navegador.
--     Toda gravação passa pelas funções abaixo (security definer), que conferem
--     quem está chamando (auth.uid()) e fazem a operação inteira de uma vez.
--   * Eventos: só inserção. Ninguém edita nem apaga, nem o dono (gatilho).

-- ---------------------------------------------------------------- tabelas

create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  wip_andamento integer not null default 3 check (wip_andamento between 1 and 20),
  wip_revisao integer not null default 2 check (wip_revisao between 1 and 20),
  criado_em timestamptz not null default now()
);

create table if not exists public.membros (
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel text not null check (papel in ('dono', 'membro')),
  entrou_em timestamptz not null default now(),
  primary key (projeto_id, usuario_id)
);
create index if not exists membros_usuario_idx on public.membros (usuario_id);

create table if not exists public.cartoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete restrict,
  -- A tabela "sprints" chega no H5 (Sprint 2); a chave estrangeira entra junto com ela.
  sprint_id uuid,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  pontos smallint not null check (pontos in (1, 2, 3, 5, 8, 13)),
  coluna_atual text not null default 'Backlog'
    check (coluna_atual in ('Backlog', 'A fazer', 'Em andamento', 'Em revisão', 'Concluído')),
  criado_em timestamptz not null default now()
);
create index if not exists cartoes_projeto_idx on public.cartoes (projeto_id, coluna_atual);

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  cartao_id uuid not null references public.cartoes (id) on delete restrict,
  -- de_coluna vazia = evento de criação do cartão.
  de_coluna text
    check (de_coluna in ('Backlog', 'A fazer', 'Em andamento', 'Em revisão', 'Concluído')),
  para_coluna text not null
    check (para_coluna in ('Backlog', 'A fazer', 'Em andamento', 'Em revisão', 'Concluído')),
  -- Hora do servidor (UTC). O gatilho abaixo ignora qualquer valor enviado.
  em timestamptz not null default now(),
  -- Se a conta for excluída (LGPD), o evento continua, sem a pessoa.
  usuario_id uuid references auth.users (id) on delete set null,
  acima_do_wip boolean not null default false
);
create index if not exists eventos_cartao_idx on public.eventos (cartao_id, em);

-- ---------------------------------------------------------------- eventos imutáveis

create or replace function public.eventos_protecao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.em := now();
    return new;
  end if;

  -- Única alteração aceita: a exclusão de uma conta zera o autor (on delete set null).
  if tg_op = 'UPDATE'
     and old.usuario_id is not null and new.usuario_id is null
     and (new.id, new.cartao_id, new.de_coluna, new.para_coluna, new.em, new.acima_do_wip)
         is not distinct from
         (old.id, old.cartao_id, old.de_coluna, old.para_coluna, old.em, old.acima_do_wip) then
    return new;
  end if;

  raise exception 'Eventos não podem ser editados nem apagados.' using errcode = '42501';
end;
$$;

drop trigger if exists eventos_protecao on public.eventos;
create trigger eventos_protecao
  before insert or update or delete on public.eventos
  for each row execute function public.eventos_protecao();

-- ---------------------------------------------------------------- quem é membro

create or replace function public.eh_membro(p_projeto uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.projeto_id = p_projeto and m.usuario_id = (select auth.uid())
  );
$$;

create or replace function public.eh_dono(p_projeto uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.projeto_id = p_projeto and m.usuario_id = (select auth.uid()) and m.papel = 'dono'
  );
$$;

-- ---------------------------------------------------------------- RLS (somente leitura)

alter table public.projetos enable row level security;
alter table public.membros enable row level security;
alter table public.cartoes enable row level security;
alter table public.eventos enable row level security;

drop policy if exists "projetos: membros leem" on public.projetos;
create policy "projetos: membros leem" on public.projetos
  for select to authenticated using (public.eh_membro(id));

drop policy if exists "membros: membros do projeto leem" on public.membros;
create policy "membros: membros do projeto leem" on public.membros
  for select to authenticated using (public.eh_membro(projeto_id));

drop policy if exists "cartoes: membros leem" on public.cartoes;
create policy "cartoes: membros leem" on public.cartoes
  for select to authenticated using (public.eh_membro(projeto_id));

drop policy if exists "eventos: membros leem" on public.eventos;
create policy "eventos: membros leem" on public.eventos
  for select to authenticated using (
    exists (
      select 1 from public.cartoes c
      where c.id = eventos.cartao_id and public.eh_membro(c.projeto_id)
    )
  );

-- ---------------------------------------------------------------- funções de escrita

-- Erros com errcode 22023 trazem uma mensagem pronta para a tela.
-- 42501 = sem acesso; 28000 = sem sessão.

create or replace function public.criar_projeto(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_nome text := btrim(coalesce(p_nome, ''));
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if char_length(v_nome) = 0 then
    raise exception 'Informe o nome do projeto.' using errcode = '22023';
  end if;
  if char_length(v_nome) > 80 then
    raise exception 'O nome do projeto pode ter no máximo 80 caracteres.' using errcode = '22023';
  end if;

  insert into public.projetos (nome) values (v_nome) returning id into v_id;
  insert into public.membros (projeto_id, usuario_id, papel) values (v_id, v_usuario, 'dono');
  return v_id;
end;
$$;

create or replace function public.definir_limites_wip(
  p_projeto uuid, p_andamento integer, p_revisao integer
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
  if not public.eh_dono(p_projeto) then
    raise exception 'Só o dono do projeto altera os limites de WIP.' using errcode = '42501';
  end if;
  if p_andamento is null or p_andamento not between 1 and 20
     or p_revisao is null or p_revisao not between 1 and 20 then
    raise exception 'Os limites de WIP devem ser números de 1 a 20.' using errcode = '22023';
  end if;

  update public.projetos
     set wip_andamento = p_andamento, wip_revisao = p_revisao
   where id = p_projeto;
end;
$$;

create or replace function public.validar_cartao(p_titulo text, p_pontos integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if char_length(v_titulo) = 0 then
    raise exception 'O título do cartão é obrigatório.' using errcode = '22023';
  end if;
  if char_length(v_titulo) > 200 then
    raise exception 'O título pode ter no máximo 200 caracteres.' using errcode = '22023';
  end if;
  if p_pontos is null or p_pontos not in (1, 2, 3, 5, 8, 13) then
    raise exception 'Os pontos devem ser 1, 2, 3, 5, 8 ou 13.' using errcode = '22023';
  end if;
  return v_titulo;
end;
$$;

create or replace function public.criar_cartao(p_projeto uuid, p_titulo text, p_pontos integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_titulo text;
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_membro(p_projeto) then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  v_titulo := public.validar_cartao(p_titulo, p_pontos);

  insert into public.cartoes (projeto_id, titulo, pontos, coluna_atual)
  values (p_projeto, v_titulo, p_pontos, 'Backlog')
  returning id into v_id;

  -- Evento de criação: de_coluna vazia, para_coluna = Backlog (Apêndice B.3).
  insert into public.eventos (cartao_id, de_coluna, para_coluna, usuario_id, acima_do_wip)
  values (v_id, null, 'Backlog', v_usuario, false);

  return v_id;
end;
$$;

create or replace function public.editar_cartao(p_cartao uuid, p_titulo text, p_pontos integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projeto uuid;
  v_titulo text;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id into v_projeto from public.cartoes where id = p_cartao;
  if v_projeto is null or not public.eh_membro(v_projeto) then
    raise exception 'Você não tem acesso a este cartão.' using errcode = '42501';
  end if;
  v_titulo := public.validar_cartao(p_titulo, p_pontos);

  update public.cartoes set titulo = v_titulo, pontos = p_pontos where id = p_cartao;
end;
$$;

-- Move o cartão e grava o evento na mesma transação.
-- Se a coluna de destino já está no limite de WIP e p_confirmar_wip = false,
-- nada é gravado e a função devolve {"status": "wip", ...} para a tela pedir confirmação.
create or replace function public.mover_cartao(
  p_cartao uuid, p_para text, p_confirmar_wip boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_cartao public.cartoes%rowtype;
  v_projeto public.projetos%rowtype;
  v_limite integer;
  v_ocupados integer;
  v_acima boolean := false;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if p_para is null or p_para not in ('Backlog', 'A fazer', 'Em andamento', 'Em revisão', 'Concluído') then
    raise exception 'Coluna de destino inválida.' using errcode = '22023';
  end if;

  select * into v_cartao from public.cartoes where id = p_cartao;
  if v_cartao.id is null or not public.eh_membro(v_cartao.projeto_id) then
    raise exception 'Você não tem acesso a este cartão.' using errcode = '42501';
  end if;

  -- Trava o projeto: duas pessoas movendo ao mesmo tempo não furam o limite sem aviso.
  select * into v_projeto from public.projetos where id = v_cartao.projeto_id for update;
  select * into v_cartao from public.cartoes where id = p_cartao for update;

  if v_cartao.coluna_atual = p_para then
    return jsonb_build_object('status', 'sem_mudanca');
  end if;

  v_limite := case p_para
    when 'Em andamento' then v_projeto.wip_andamento
    when 'Em revisão' then v_projeto.wip_revisao
    else null
  end;

  if v_limite is not null then
    select count(*) into v_ocupados
      from public.cartoes
     where projeto_id = v_projeto.id and coluna_atual = p_para;
    v_acima := v_ocupados >= v_limite;
    if v_acima and not coalesce(p_confirmar_wip, false) then
      return jsonb_build_object(
        'status', 'wip', 'coluna', p_para, 'limite', v_limite, 'ocupados', v_ocupados
      );
    end if;
  end if;

  update public.cartoes set coluna_atual = p_para where id = p_cartao;
  insert into public.eventos (cartao_id, de_coluna, para_coluna, usuario_id, acima_do_wip)
  values (p_cartao, v_cartao.coluna_atual, p_para, v_usuario, v_acima);

  return jsonb_build_object('status', 'ok', 'acima_do_wip', v_acima);
end;
$$;

-- ---------------------------------------------------------------- permissões

-- Funções de escrita: só usuários autenticados (a própria função confere a sessão).
revoke execute on function public.criar_projeto(text) from public, anon;
revoke execute on function public.definir_limites_wip(uuid, integer, integer) from public, anon;
revoke execute on function public.criar_cartao(uuid, text, integer) from public, anon;
revoke execute on function public.editar_cartao(uuid, text, integer) from public, anon;
revoke execute on function public.mover_cartao(uuid, text, boolean) from public, anon;
grant execute on function public.criar_projeto(text) to authenticated;
grant execute on function public.definir_limites_wip(uuid, integer, integer) to authenticated;
grant execute on function public.criar_cartao(uuid, text, integer) to authenticated;
grant execute on function public.editar_cartao(uuid, text, integer) to authenticated;
grant execute on function public.mover_cartao(uuid, text, boolean) to authenticated;

-- Funções internas: não ficam expostas como RPC para visitantes.
revoke execute on function public.eventos_protecao() from public, anon, authenticated;
revoke execute on function public.validar_cartao(text, integer) from public, anon;
revoke execute on function public.eh_membro(uuid) from public, anon;
revoke execute on function public.eh_dono(uuid) from public, anon;
grant execute on function public.eh_membro(uuid) to authenticated;
grant execute on function public.eh_dono(uuid) to authenticated;
grant execute on function public.validar_cartao(text, integer) to authenticated;
