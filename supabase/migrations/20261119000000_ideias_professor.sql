-- Ideias do professor (aula de 17/11): criar card escolhendo a coluna, WIP na
-- criação do projeto, detalhe do card (descrição e checklist), Fibonacci de 0 a
-- 89, convite por link com validade, membros e Planning Poker.
--
-- O banco é o mesmo para todas as versões (sprint-1 e main), então esta
-- migration só ADICIONA: tabelas, colunas e funções novas. As funções antigas
-- (criar_cartao, criar_projeto, ...) continuam iguais para a versão da Sprint 1.
-- As duas únicas mudanças em coisas existentes são compatíveis com ela:
--   * a lista de pontos aceita fica MAIOR (quem manda 1..13 continua válido);
--   * validar_cartao passa a aceitar a lista nova.

-- ================================================================ C · Fibonacci

alter table public.cartoes drop constraint if exists cartoes_pontos_check;
alter table public.cartoes drop constraint if exists cartoes_pontos_fibonacci;
alter table public.cartoes add constraint cartoes_pontos_fibonacci
  check (pontos in (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89));

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
  if p_pontos is null or p_pontos not in (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89) then
    raise exception 'Os pontos devem ser da escala Fibonacci: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55 ou 89.' using errcode = '22023';
  end if;
  return v_titulo;
end;
$$;

-- ================================================================ A · criar projeto com WIP

create or replace function public.criar_projeto_com_wip(p_nome text, p_andamento integer, p_revisao integer)
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
  if p_andamento is null or p_andamento not between 1 and 20
     or p_revisao is null or p_revisao not between 1 and 20 then
    raise exception 'Os limites de WIP devem ser números de 1 a 20.' using errcode = '22023';
  end if;

  insert into public.projetos (nome, wip_andamento, wip_revisao)
  values (v_nome, p_andamento, p_revisao)
  returning id into v_id;
  insert into public.membros (projeto_id, usuario_id, papel) values (v_id, v_usuario, 'dono');
  return v_id;
end;
$$;

-- ================================================================ B · descrição e checklist

alter table public.cartoes add column if not exists descricao text;
alter table public.cartoes drop constraint if exists cartoes_descricao_tamanho;
alter table public.cartoes add constraint cartoes_descricao_tamanho
  check (descricao is null or char_length(descricao) <= 2000);

create table if not exists public.checklist_itens (
  id uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references public.cartoes (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 200),
  feito boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists checklist_itens_cartao_idx on public.checklist_itens (cartao_id, criado_em);

alter table public.checklist_itens enable row level security;
drop policy if exists "checklist: membros leem" on public.checklist_itens;
create policy "checklist: membros leem" on public.checklist_itens
  for select to authenticated using (
    exists (
      select 1 from public.cartoes c
      where c.id = checklist_itens.cartao_id and public.eh_membro(c.projeto_id)
    )
  );

-- Confere o acesso ao cartão e devolve o projeto dele (uso interno das funções abaixo).
create or replace function public.projeto_do_cartao(p_cartao uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_projeto uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id into v_projeto from public.cartoes where id = p_cartao;
  if v_projeto is null or not public.eh_membro(v_projeto) then
    raise exception 'Você não tem acesso a este cartão.' using errcode = '42501';
  end if;
  return v_projeto;
end;
$$;

-- Criar cartão já escolhendo a coluna (e a descrição). Respeita o WIP como mover_cartao:
-- se a coluna estiver cheia, devolve status "wip" e só grava com p_confirmar_wip = true.
create or replace function public.criar_cartao_na_coluna(
  p_projeto uuid, p_titulo text, p_pontos integer, p_coluna text,
  p_descricao text default null, p_confirmar_wip boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_projeto public.projetos%rowtype;
  v_titulo text;
  v_descricao text := nullif(btrim(coalesce(p_descricao, '')), '');
  v_limite integer;
  v_ocupados integer;
  v_acima boolean := false;
  v_sprint uuid;
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_membro(p_projeto) then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  if p_coluna is null or p_coluna not in ('Backlog', 'A fazer', 'Em andamento', 'Em revisão', 'Concluído') then
    raise exception 'Escolha uma coluna válida.' using errcode = '22023';
  end if;
  if v_descricao is not null and char_length(v_descricao) > 2000 then
    raise exception 'A descrição pode ter no máximo 2000 caracteres.' using errcode = '22023';
  end if;
  v_titulo := public.validar_cartao(p_titulo, p_pontos);

  select * into v_projeto from public.projetos where id = p_projeto for update;

  v_limite := case p_coluna
    when 'Em andamento' then v_projeto.wip_andamento
    when 'Em revisão' then v_projeto.wip_revisao
    else null
  end;
  if v_limite is not null then
    select count(*) into v_ocupados from public.cartoes
     where projeto_id = p_projeto and coluna_atual = p_coluna;
    v_acima := v_ocupados >= v_limite;
    if v_acima and not coalesce(p_confirmar_wip, false) then
      return jsonb_build_object('status', 'wip', 'coluna', p_coluna, 'limite', v_limite, 'ocupados', v_ocupados);
    end if;
  end if;

  -- Fora do Backlog, o cartão entra na Sprint ativa (se houver), como quando é puxado.
  if p_coluna <> 'Backlog' then
    select id into v_sprint from public.sprints where projeto_id = p_projeto and not encerrada;
  end if;

  insert into public.cartoes (projeto_id, titulo, pontos, coluna_atual, descricao, sprint_id)
  values (p_projeto, v_titulo, p_pontos, p_coluna, v_descricao, v_sprint)
  returning id into v_id;

  -- Evento de criação: de_coluna vazia, para_coluna = coluna escolhida.
  insert into public.eventos (cartao_id, de_coluna, para_coluna, usuario_id, acima_do_wip)
  values (v_id, null, p_coluna, v_usuario, v_acima);

  return jsonb_build_object('status', 'ok', 'id', v_id, 'acima_do_wip', v_acima);
end;
$$;

create or replace function public.salvar_descricao(p_cartao uuid, p_descricao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_descricao text := nullif(btrim(coalesce(p_descricao, '')), '');
begin
  perform public.projeto_do_cartao(p_cartao);
  if v_descricao is not null and char_length(v_descricao) > 2000 then
    raise exception 'A descrição pode ter no máximo 2000 caracteres.' using errcode = '22023';
  end if;
  update public.cartoes set descricao = v_descricao where id = p_cartao;
end;
$$;

create or replace function public.adicionar_item_checklist(p_cartao uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_texto text := btrim(coalesce(p_texto, ''));
  v_id uuid;
begin
  perform public.projeto_do_cartao(p_cartao);
  if char_length(v_texto) = 0 or char_length(v_texto) > 200 then
    raise exception 'O item precisa ter de 1 a 200 caracteres.' using errcode = '22023';
  end if;
  if (select count(*) from public.checklist_itens where cartao_id = p_cartao) >= 30 then
    raise exception 'O checklist pode ter no máximo 30 itens.' using errcode = '22023';
  end if;
  insert into public.checklist_itens (cartao_id, texto) values (p_cartao, v_texto) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.marcar_item_checklist(p_item uuid, p_feito boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cartao uuid;
begin
  select cartao_id into v_cartao from public.checklist_itens where id = p_item;
  if v_cartao is null then
    raise exception 'Item não encontrado.' using errcode = '42501';
  end if;
  perform public.projeto_do_cartao(v_cartao);
  update public.checklist_itens set feito = coalesce(p_feito, false) where id = p_item;
end;
$$;

create or replace function public.remover_item_checklist(p_item uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cartao uuid;
begin
  select cartao_id into v_cartao from public.checklist_itens where id = p_item;
  if v_cartao is null then
    raise exception 'Item não encontrado.' using errcode = '42501';
  end if;
  perform public.projeto_do_cartao(v_cartao);
  delete from public.checklist_itens where id = p_item;
end;
$$;

-- ================================================================ D · membros e convite

-- Um convite por projeto. Gerar de novo troca o código (o link antigo para de valer).
create table if not exists public.convites (
  projeto_id uuid primary key references public.projetos (id) on delete cascade,
  codigo text not null unique,
  expira_em timestamptz not null,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.convites enable row level security;
drop policy if exists "convites: dono lê" on public.convites;
create policy "convites: dono lê" on public.convites
  for select to authenticated using (public.eh_dono(projeto_id));

create or replace function public.gerar_convite(p_projeto uuid, p_dias integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 2 UUIDs aleatórios = 64 caracteres hexadecimais, impossível de adivinhar.
  v_codigo text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_dono(p_projeto) then
    raise exception 'Só o dono do projeto gera o link de convite.' using errcode = '42501';
  end if;
  if p_dias is null or p_dias not between 1 and 30 then
    raise exception 'O convite pode valer de 1 a 30 dias.' using errcode = '22023';
  end if;
  insert into public.convites (projeto_id, codigo, expira_em, criado_por)
  values (p_projeto, v_codigo, now() + make_interval(days => p_dias), (select auth.uid()))
  on conflict (projeto_id) do update
    set codigo = excluded.codigo, expira_em = excluded.expira_em,
        criado_por = excluded.criado_por, criado_em = now();
  return v_codigo;
end;
$$;

create or replace function public.cancelar_convite(p_projeto uuid)
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
    raise exception 'Só o dono do projeto cancela o convite.' using errcode = '42501';
  end if;
  delete from public.convites where projeto_id = p_projeto;
end;
$$;

-- Mostra para quem abriu o link qual é o projeto, antes de aceitar.
create or replace function public.ver_convite(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.convites%rowtype;
  v_nome text;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select * into v from public.convites where codigo = p_codigo;
  if v.projeto_id is null then
    return jsonb_build_object('status', 'invalido');
  end if;
  select nome into v_nome from public.projetos where id = v.projeto_id;
  if v.expira_em < now() then
    return jsonb_build_object('status', 'expirado', 'projeto', v_nome);
  end if;
  return jsonb_build_object(
    'status', case when public.eh_membro(v.projeto_id) then 'ja_membro' else 'valido' end,
    'projeto_id', v.projeto_id, 'projeto', v_nome, 'expira_em', v.expira_em
  );
end;
$$;

create or replace function public.aceitar_convite(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v public.convites%rowtype;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select * into v from public.convites where codigo = p_codigo;
  if v.projeto_id is null then
    raise exception 'Convite inválido. Peça um link novo ao dono do projeto.' using errcode = '22023';
  end if;
  if v.expira_em < now() then
    raise exception 'Este convite expirou. Peça um link novo ao dono do projeto.' using errcode = '22023';
  end if;
  insert into public.membros (projeto_id, usuario_id, papel)
  values (v.projeto_id, v_usuario, 'membro')
  on conflict (projeto_id, usuario_id) do nothing;
  return v.projeto_id;
end;
$$;

-- O perfil (nome e e-mail) só é lido pelo próprio usuário (RLS de perfis);
-- esta função devolve os colegas de projeto, e só para quem é membro.
create or replace function public.listar_membros(p_projeto uuid)
returns table (usuario_id uuid, nome text, email text, papel text, entrou_em timestamptz)
language plpgsql
stable
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
  return query
    select m.usuario_id, coalesce(p.nome, 'Sem nome'), coalesce(p.email, ''), m.papel, m.entrou_em
      from public.membros m
      left join public.perfis p on p.id = m.usuario_id
     where m.projeto_id = p_projeto
     order by (m.papel = 'dono') desc, m.entrou_em;
end;
$$;

create or replace function public.remover_membro(p_projeto uuid, p_usuario uuid)
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
    raise exception 'Só o dono do projeto remove membros.' using errcode = '42501';
  end if;
  if p_usuario = (select auth.uid()) then
    raise exception 'O dono não pode se remover do próprio projeto.' using errcode = '22023';
  end if;
  delete from public.membros where projeto_id = p_projeto and usuario_id = p_usuario and papel = 'membro';
  -- Votos de quem saiu deixam de contar nas votações abertas.
  delete from public.votos v using public.votacoes x
   where v.votacao_id = x.id and x.projeto_id = p_projeto and x.situacao <> 'encerrada' and v.usuario_id = p_usuario;
end;
$$;

-- ================================================================ E · Planning Poker

-- Votação de pontos de um cartão ou do limite de WIP de uma coluna.
-- situacao: 'aberta' (votos escondidos) -> 'revelada' (todos veem) -> 'encerrada' (valor aplicado).
create table if not exists public.votacoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  tipo text not null check (tipo in ('pontos', 'wip')),
  cartao_id uuid references public.cartoes (id) on delete cascade,
  coluna text check (coluna in ('Em andamento', 'Em revisão')),
  situacao text not null default 'aberta' check (situacao in ('aberta', 'revelada', 'encerrada')),
  resultado integer,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  encerrada_em timestamptz,
  check ((tipo = 'pontos' and cartao_id is not null and coluna is null)
      or (tipo = 'wip' and coluna is not null and cartao_id is null))
);
create index if not exists votacoes_projeto_idx on public.votacoes (projeto_id, criado_em desc);
-- Uma votação em andamento por cartão e por coluna.
create unique index if not exists votacoes_uma_por_cartao_idx
  on public.votacoes (cartao_id) where situacao <> 'encerrada' and cartao_id is not null;
create unique index if not exists votacoes_uma_por_coluna_idx
  on public.votacoes (projeto_id, coluna) where situacao <> 'encerrada' and coluna is not null;

create table if not exists public.votos (
  votacao_id uuid not null references public.votacoes (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  valor integer not null,
  votado_em timestamptz not null default now(),
  primary key (votacao_id, usuario_id)
);

alter table public.votacoes enable row level security;
alter table public.votos enable row level security;
drop policy if exists "votacoes: membros leem" on public.votacoes;
create policy "votacoes: membros leem" on public.votacoes
  for select to authenticated using (public.eh_membro(projeto_id));
-- Sem política em votos: ninguém lê a tabela direto. Os votos saem pela função
-- votos_da_votacao, que esconde o valor dos outros até a votação ser revelada.

create or replace function public.votacao_acessivel(p_votacao uuid)
returns public.votacoes
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select * into v from public.votacoes where id = p_votacao;
  if v.id is null or not public.eh_membro(v.projeto_id) then
    raise exception 'Você não tem acesso a esta votação.' using errcode = '42501';
  end if;
  return v;
end;
$$;

create or replace function public.abrir_votacao(p_projeto uuid, p_tipo text, p_cartao uuid, p_coluna text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_membro(p_projeto) then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  if p_tipo = 'pontos' then
    if not exists (select 1 from public.cartoes where id = p_cartao and projeto_id = p_projeto) then
      raise exception 'Cartão não encontrado neste projeto.' using errcode = '22023';
    end if;
    if exists (select 1 from public.votacoes where cartao_id = p_cartao and situacao <> 'encerrada') then
      raise exception 'Este cartão já tem uma votação em andamento.' using errcode = '22023';
    end if;
    insert into public.votacoes (projeto_id, tipo, cartao_id, criado_por)
    values (p_projeto, 'pontos', p_cartao, (select auth.uid())) returning id into v_id;
  elsif p_tipo = 'wip' then
    if p_coluna is null or p_coluna not in ('Em andamento', 'Em revisão') then
      raise exception 'Escolha a coluna: Em andamento ou Em revisão.' using errcode = '22023';
    end if;
    if exists (select 1 from public.votacoes where projeto_id = p_projeto and coluna = p_coluna and situacao <> 'encerrada') then
      raise exception 'Já existe uma votação em andamento para o WIP desta coluna.' using errcode = '22023';
    end if;
    insert into public.votacoes (projeto_id, tipo, coluna, criado_por)
    values (p_projeto, 'wip', p_coluna, (select auth.uid())) returning id into v_id;
  else
    raise exception 'Tipo de votação inválido.' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

create or replace function public.votar(p_votacao uuid, p_valor integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  if v.situacao <> 'aberta' then
    raise exception 'Os votos já foram revelados. Não é possível votar agora.' using errcode = '22023';
  end if;
  if v.tipo = 'pontos' and (p_valor is null or p_valor not in (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89)) then
    raise exception 'Vote um valor da escala Fibonacci (0 a 89).' using errcode = '22023';
  end if;
  if v.tipo = 'wip' and (p_valor is null or p_valor not between 1 and 20) then
    raise exception 'Vote um limite de WIP de 1 a 20.' using errcode = '22023';
  end if;
  insert into public.votos (votacao_id, usuario_id, valor)
  values (p_votacao, (select auth.uid()), p_valor)
  on conflict (votacao_id, usuario_id) do update set valor = excluded.valor, votado_em = now();
end;
$$;

create or replace function public.revelar_votacao(p_votacao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  if v.situacao <> 'aberta' then
    raise exception 'Esta votação já foi revelada.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.votos where votacao_id = p_votacao) then
    raise exception 'Ninguém votou ainda.' using errcode = '22023';
  end if;
  update public.votacoes set situacao = 'revelada' where id = p_votacao;
end;
$$;

-- Volta para "aberta" e apaga os votos: o time discute e vota de novo (rodada nova).
create or replace function public.nova_rodada(p_votacao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  if v.situacao = 'encerrada' then
    raise exception 'Esta votação já foi encerrada.' using errcode = '22023';
  end if;
  delete from public.votos where votacao_id = p_votacao;
  update public.votacoes set situacao = 'aberta' where id = p_votacao;
end;
$$;

-- O time escolhe o valor final (depois de revelar) e ele é aplicado:
-- pontos do cartão ou limite de WIP da coluna. Qualquer membro pode encerrar,
-- porque a decisão é do time (ideia do professor: WIP moldável pelo time).
create or replace function public.encerrar_votacao(p_votacao uuid, p_resultado integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  if v.situacao <> 'revelada' then
    raise exception 'Revele os votos antes de decidir o valor final.' using errcode = '22023';
  end if;
  if v.tipo = 'pontos' then
    if p_resultado is null or p_resultado not in (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89) then
      raise exception 'Escolha um valor da escala Fibonacci (0 a 89).' using errcode = '22023';
    end if;
    update public.cartoes set pontos = p_resultado where id = v.cartao_id;
  else
    if p_resultado is null or p_resultado not between 1 and 20 then
      raise exception 'O limite de WIP deve ser de 1 a 20.' using errcode = '22023';
    end if;
    if v.coluna = 'Em andamento' then
      update public.projetos set wip_andamento = p_resultado where id = v.projeto_id;
    else
      update public.projetos set wip_revisao = p_resultado where id = v.projeto_id;
    end if;
  end if;
  update public.votacoes set situacao = 'encerrada', resultado = p_resultado, encerrada_em = now()
   where id = p_votacao;
end;
$$;

create or replace function public.cancelar_votacao(p_votacao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  if v.situacao = 'encerrada' then
    raise exception 'Esta votação já foi encerrada.' using errcode = '22023';
  end if;
  delete from public.votacoes where id = p_votacao;
end;
$$;

-- Quem votou em cada votação do projeto. O valor dos outros só aparece depois de revelar;
-- o seu próprio voto você sempre vê.
create or replace function public.votos_do_projeto(p_projeto uuid)
returns table (votacao_id uuid, usuario_id uuid, nome text, valor integer)
language plpgsql
stable
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
  return query
    select v.votacao_id, v.usuario_id, coalesce(p.nome, 'Sem nome'),
           case when x.situacao <> 'aberta' or v.usuario_id = (select auth.uid()) then v.valor end
      from public.votos v
      join public.votacoes x on x.id = v.votacao_id
      left join public.perfis p on p.id = v.usuario_id
     where x.projeto_id = p_projeto
     order by v.votado_em;
end;
$$;

-- ================================================================ permissões

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.criar_projeto_com_wip(text, integer, integer)',
    'public.criar_cartao_na_coluna(uuid, text, integer, text, text, boolean)',
    'public.salvar_descricao(uuid, text)',
    'public.adicionar_item_checklist(uuid, text)',
    'public.marcar_item_checklist(uuid, boolean)',
    'public.remover_item_checklist(uuid)',
    'public.gerar_convite(uuid, integer)',
    'public.cancelar_convite(uuid)',
    'public.ver_convite(text)',
    'public.aceitar_convite(text)',
    'public.listar_membros(uuid)',
    'public.remover_membro(uuid, uuid)',
    'public.abrir_votacao(uuid, text, uuid, text)',
    'public.votar(uuid, integer)',
    'public.revelar_votacao(uuid)',
    'public.nova_rodada(uuid)',
    'public.encerrar_votacao(uuid, integer)',
    'public.cancelar_votacao(uuid)',
    'public.votos_do_projeto(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Funções internas: só as outras funções usam.
revoke execute on function public.projeto_do_cartao(uuid) from public, anon, authenticated;
revoke execute on function public.votacao_acessivel(uuid) from public, anon, authenticated;
