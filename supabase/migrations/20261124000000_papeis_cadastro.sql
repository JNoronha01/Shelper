-- Papéis no time (PO, SM e desenvolvedor) e cadastro completo do projeto,
-- pedidos pelo professor na conversa de 21/11.
--
--  * PO: é o gestor do projeto (quem cria). Pode tudo: cartões, Sprint, metas, WIP,
--    votações, convite, papéis e o cadastro do projeto. Só existe um PO por projeto.
--  * SM: cria e edita a Sprint, vê as métricas do time, altera o WIP e conduz as votações.
--  * Desenvolvedor: quem entra pelo convite. Move cartões, marca checklist, escreve na
--    descrição e vota no Planning Poker. Não cria nem altera cartões, Sprints ou regras.
--
-- Compatível com as versões antigas (branches sprint-N), que usam o mesmo banco:
-- a coluna "papel" (dono/membro) continua existindo e andando junto com a função:
-- o PO é sempre o "dono". Os campos novos do projeto aceitam vazio no banco (projetos
-- antigos e a versão da Sprint 1 não os preenchem); o site novo exige todos na criação.

-- ================================================================ função no time

alter table public.membros add column if not exists funcao text;
update public.membros set funcao = case papel when 'dono' then 'po' else 'dev' end where funcao is null;
alter table public.membros drop constraint if exists membros_funcao_valida;
alter table public.membros add constraint membros_funcao_valida check (funcao in ('po', 'sm', 'dev'));
alter table public.membros alter column funcao set not null;
create unique index if not exists membros_um_po_idx on public.membros (projeto_id) where funcao = 'po';

-- Quem entra sem função definida (código antigo, convite) vira PO se for o dono e dev se não.
create or replace function public.membros_funcao_padrao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.funcao is null then
    new.funcao := case new.papel when 'dono' then 'po' else 'dev' end;
  end if;
  return new;
end;
$$;
drop trigger if exists membros_funcao_padrao on public.membros;
create trigger membros_funcao_padrao before insert on public.membros
  for each row execute function public.membros_funcao_padrao();

-- Função do usuário logado no projeto (null se não for membro).
create or replace function public.minha_funcao(p_projeto uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select funcao from public.membros where projeto_id = p_projeto and usuario_id = (select auth.uid());
$$;

-- Barra a ação se o usuário não tiver uma das funções pedidas.
create or replace function public.exigir_funcao(p_projeto uuid, p_funcoes text[], p_mensagem text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_funcao text;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  v_funcao := public.minha_funcao(p_projeto);
  if v_funcao is null then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  if not (v_funcao = any (p_funcoes)) then
    raise exception '%', coalesce(p_mensagem, 'Seu papel no time não permite esta ação.') using errcode = '42501';
  end if;
end;
$$;

-- O PO muda a função de um membro (SM ou desenvolvedor).
create or replace function public.definir_funcao(p_projeto uuid, p_usuario uuid, p_funcao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO muda o papel das pessoas.');
  if p_funcao is null or p_funcao not in ('sm', 'dev') then
    raise exception 'Escolha SM ou Desenvolvedor. Para passar o papel de PO, use "Tornar PO".' using errcode = '22023';
  end if;
  if p_usuario = (select auth.uid()) then
    raise exception 'O PO não muda o próprio papel; passe o papel de PO para outra pessoa.' using errcode = '22023';
  end if;
  update public.membros set funcao = p_funcao
   where projeto_id = p_projeto and usuario_id = p_usuario and funcao <> 'po';
  if not found then
    raise exception 'Essa pessoa não está no projeto.' using errcode = '22023';
  end if;
end;
$$;

-- O PO passa o papel de PO (e de dono) para outro membro; ele fica com o papel que a outra pessoa tinha.
create or replace function public.transferir_po(p_projeto uuid, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := (select auth.uid());
  v_funcao_dele text;
begin
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO passa o papel de PO.');
  if p_usuario = v_eu then
    raise exception 'Você já é o PO.' using errcode = '22023';
  end if;
  select funcao into v_funcao_dele from public.membros where projeto_id = p_projeto and usuario_id = p_usuario;
  if v_funcao_dele is null then
    raise exception 'Essa pessoa não está no projeto.' using errcode = '22023';
  end if;
  update public.membros set funcao = v_funcao_dele, papel = 'membro' where projeto_id = p_projeto and usuario_id = v_eu;
  update public.membros set funcao = 'po', papel = 'dono' where projeto_id = p_projeto and usuario_id = p_usuario;
end;
$$;

-- Time com a função de cada um (listar_membros continua igual para a versão anterior).
create or replace function public.listar_time(p_projeto uuid)
returns table (usuario_id uuid, nome text, email text, funcao text, entrou_em timestamptz)
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
    select m.usuario_id, coalesce(p.nome, 'Sem nome'), coalesce(p.email, ''), m.funcao, m.entrou_em
      from public.membros m
      left join public.perfis p on p.id = m.usuario_id
     where m.projeto_id = p_projeto
     order by case m.funcao when 'po' then 0 when 'sm' then 1 else 2 end, m.entrou_em;
end;
$$;

-- ================================================================ cadastro do projeto

alter table public.projetos add column if not exists cliente text;
alter table public.projetos add column if not exists objetivo text;
alter table public.projetos add column if not exists horas_contratadas integer;
alter table public.projetos add column if not exists data_inicio date;
alter table public.projetos add column if not exists data_entrega date;
alter table public.projetos add column if not exists duracao_sprint integer;

alter table public.projetos drop constraint if exists projetos_cadastro_valido;
alter table public.projetos add constraint projetos_cadastro_valido check (
      (cliente is null or char_length(btrim(cliente)) between 1 and 80)
  and (objetivo is null or char_length(btrim(objetivo)) between 1 and 300)
  and (horas_contratadas is null or horas_contratadas between 1 and 100000)
  and (duracao_sprint is null or duracao_sprint between 1 and 60)
  and (data_inicio is null or data_entrega is null or data_entrega >= data_inicio)
);

-- Confere todos os campos do cadastro (todos obrigatórios no site novo).
create or replace function public.validar_cadastro_projeto(
  p_nome text, p_cliente text, p_objetivo text, p_horas integer, p_inicio date, p_entrega date,
  p_duracao integer, p_lead numeric, p_cycle numeric, p_velocity integer
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_nome, ''))) not between 1 and 80 then
    raise exception 'Informe o nome do projeto (até 80 caracteres).' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_cliente, ''))) not between 1 and 80 then
    raise exception 'Informe o cliente (até 80 caracteres).' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_objetivo, ''))) not between 1 and 300 then
    raise exception 'Informe o objetivo do projeto (até 300 caracteres).' using errcode = '22023';
  end if;
  if p_horas is null or p_horas not between 1 and 100000 then
    raise exception 'Informe as horas contratadas (de 1 a 100000).' using errcode = '22023';
  end if;
  if p_inicio is null or p_entrega is null then
    raise exception 'Informe as datas de início e de entrega.' using errcode = '22023';
  end if;
  if p_entrega < p_inicio then
    raise exception 'A data de entrega não pode ser antes do início.' using errcode = '22023';
  end if;
  if p_duracao is null or p_duracao not between 1 and 60 then
    raise exception 'A duração da Sprint deve ser de 1 a 60 dias.' using errcode = '22023';
  end if;
  if p_lead is null or p_lead <= 0 or p_cycle is null or p_cycle <= 0 or p_velocity is null or p_velocity <= 0 then
    raise exception 'Informe as metas de Lead Time, Cycle Time e Velocity (maiores que zero).' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.criar_projeto_completo(
  p_nome text, p_cliente text, p_objetivo text, p_horas integer, p_inicio date, p_entrega date,
  p_duracao integer, p_lead numeric, p_cycle numeric, p_velocity integer,
  p_andamento integer, p_revisao integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  perform public.validar_cadastro_projeto(p_nome, p_cliente, p_objetivo, p_horas, p_inicio, p_entrega, p_duracao, p_lead, p_cycle, p_velocity);
  if p_andamento is null or p_andamento not between 1 and 20 or p_revisao is null or p_revisao not between 1 and 20 then
    raise exception 'Os limites de WIP devem ser números de 1 a 20.' using errcode = '22023';
  end if;

  insert into public.projetos (
    nome, cliente, objetivo, horas_contratadas, data_inicio, data_entrega, duracao_sprint,
    meta_lead_dias, meta_cycle_horas, meta_velocity, wip_andamento, wip_revisao
  ) values (
    btrim(p_nome), btrim(p_cliente), btrim(p_objetivo), p_horas, p_inicio, p_entrega, p_duracao,
    p_lead, p_cycle, p_velocity, p_andamento, p_revisao
  ) returning id into v_id;
  insert into public.membros (projeto_id, usuario_id, papel, funcao) values (v_id, v_usuario, 'dono', 'po');
  return v_id;
end;
$$;

-- O PO completa ou corrige o cadastro (também serve para os projetos criados antes).
create or replace function public.editar_projeto(
  p_projeto uuid, p_nome text, p_cliente text, p_objetivo text, p_horas integer, p_inicio date, p_entrega date,
  p_duracao integer, p_lead numeric, p_cycle numeric, p_velocity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO altera o cadastro do projeto.');
  perform public.validar_cadastro_projeto(p_nome, p_cliente, p_objetivo, p_horas, p_inicio, p_entrega, p_duracao, p_lead, p_cycle, p_velocity);
  update public.projetos
     set nome = btrim(p_nome), cliente = btrim(p_cliente), objetivo = btrim(p_objetivo),
         horas_contratadas = p_horas, data_inicio = p_inicio, data_entrega = p_entrega,
         duracao_sprint = p_duracao, meta_lead_dias = p_lead, meta_cycle_horas = p_cycle, meta_velocity = p_velocity
   where id = p_projeto;
end;
$$;

-- ================================================================ permissões nas funções existentes
-- Mesmo corpo de antes, com uma linha a mais no começo: perform public.exigir_funcao(...).

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
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO cria cartões.');
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
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO cria cartões.');
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
  perform public.exigir_funcao((select projeto_id from public.cartoes where id = p_cartao), array['po'], 'Só o PO edita o título e os pontos do cartão.');
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

create or replace function public.definir_metas(
  p_projeto uuid, p_lead numeric, p_cycle numeric, p_velocity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO altera as metas do projeto.');
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
  perform public.exigir_funcao(p_projeto, array['po','sm'], 'Só o PO e o SM criam Sprints.');
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
  perform public.exigir_funcao((select projeto_id from public.sprints where id = p_sprint), array['po','sm'], 'Só o PO e o SM editam a Sprint.');
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
  perform public.exigir_funcao((select projeto_id from public.sprints where id = p_sprint), array['po','sm'], 'Só o PO e o SM encerram a Sprint.');
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
  perform public.exigir_funcao((select projeto_id from public.sprints where id = p_sprint), array['po','sm'], 'Só o PO e o SM montam a Sprint.');
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

create or replace function public.abrir_votacao(p_projeto uuid, p_tipo text, p_cartao uuid, p_coluna text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.exigir_funcao(p_projeto, array['po','sm'], 'Só o PO e o SM abrem votações.');
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

create or replace function public.revelar_votacao(p_votacao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  perform public.exigir_funcao(v.projeto_id, array['po','sm'], 'Só o PO e o SM revelam os votos.');
  if v.situacao <> 'aberta' then
    raise exception 'Esta votação já foi revelada.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.votos where votacao_id = p_votacao) then
    raise exception 'Ninguém votou ainda.' using errcode = '22023';
  end if;
  update public.votacoes set situacao = 'revelada' where id = p_votacao;
end;
$$;

create or replace function public.nova_rodada(p_votacao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  perform public.exigir_funcao(v.projeto_id, array['po','sm'], 'Só o PO e o SM começam uma nova rodada.');
  if v.situacao = 'encerrada' then
    raise exception 'Esta votação já foi encerrada.' using errcode = '22023';
  end if;
  delete from public.votos where votacao_id = p_votacao;
  update public.votacoes set situacao = 'aberta' where id = p_votacao;
end;
$$;

create or replace function public.encerrar_votacao(p_votacao uuid, p_resultado integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.votacoes%rowtype := public.votacao_acessivel(p_votacao);
begin
  perform public.exigir_funcao(v.projeto_id, array['po','sm'], 'Só o PO e o SM decidem o valor final.');
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
  perform public.exigir_funcao(v.projeto_id, array['po','sm'], 'Só o PO e o SM cancelam votações.');
  if v.situacao = 'encerrada' then
    raise exception 'Esta votação já foi encerrada.' using errcode = '22023';
  end if;
  delete from public.votacoes where id = p_votacao;
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
  perform public.exigir_funcao(p_projeto, array['po','sm'], 'Só o PO e o SM alteram os limites de WIP.');
  if p_andamento is null or p_andamento not between 1 and 20
     or p_revisao is null or p_revisao not between 1 and 20 then
    raise exception 'Os limites de WIP devem ser números de 1 a 20.' using errcode = '22023';
  end if;

  update public.projetos
     set wip_andamento = p_andamento, wip_revisao = p_revisao
   where id = p_projeto;
end;
$$;

-- ================================================================ execução

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.definir_funcao(uuid, uuid, text)',
    'public.transferir_po(uuid, uuid)',
    'public.listar_time(uuid)',
    'public.criar_projeto_completo(text, text, text, integer, date, date, integer, numeric, numeric, integer, integer, integer)',
    'public.editar_projeto(uuid, text, text, text, integer, date, date, integer, numeric, numeric, integer)',
    'public.minha_funcao(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Internas: só as outras funções usam.
revoke execute on function public.exigir_funcao(uuid, text[], text) from public, anon, authenticated;
revoke execute on function public.validar_cadastro_projeto(text, text, text, integer, date, date, integer, numeric, numeric, integer) from public, anon, authenticated;
revoke execute on function public.membros_funcao_padrao() from public, anon, authenticated;
