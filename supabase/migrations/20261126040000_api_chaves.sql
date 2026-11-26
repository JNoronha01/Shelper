-- API do Shelper para IAs e outros programas (REST em /api/v1 e servidor MCP em /api/mcp).
-- Só acrescenta: a tabela de chaves e funções novas. Nada existente muda.
--
-- Como funciona:
--   1. Uma pessoa do time gera uma chave na aba Projeto (criar_chave_api). A chave aparece UMA vez;
--      o banco guarda só o hash SHA-256 dela, como uma senha.
--   2. Cada chamada da API manda a chave. api_dados / api_executar conferem a chave, descobrem
--      quem a criou e AGEM COMO ESSA PESSOA: ligam o auth.uid() dela só dentro da transação e
--      chamam as mesmas funções que o site usa. Então a IA só faz o que essa pessoa pode fazer
--      (PO, SM ou Dev), e se ela sair do time a chave para de funcionar.

create table if not exists public.api_chaves (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  criado_por uuid not null references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  prefixo text not null,                 -- começo da chave, para a pessoa reconhecer ("shp_3f9a…")
  hash text not null unique,             -- sha256 da chave inteira
  criado_em timestamptz not null default now(),
  expira_em timestamptz,                 -- null = sem validade
  revogada_em timestamptz,
  ultimo_uso_em timestamptz
);
create index if not exists api_chaves_projeto on public.api_chaves (projeto_id, criado_por);
alter table public.api_chaves enable row level security;

-- Cada pessoa vê só as próprias chaves, e nunca o hash.
drop policy if exists "ver as próprias chaves" on public.api_chaves;
create policy "ver as próprias chaves" on public.api_chaves
  for select to authenticated using (criado_por = (select auth.uid()));
revoke all on public.api_chaves from anon, authenticated;
grant select (id, projeto_id, nome, prefixo, criado_em, expira_em, revogada_em, ultimo_uso_em) on public.api_chaves to authenticated;

-- ---------------------------------------------------------------- gerar e revogar (pelo site, logado)

create or replace function public.criar_chave_api(p_projeto uuid, p_nome text, p_dias integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_nome text := btrim(coalesce(p_nome, ''));
  v_chave text;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if not public.eh_membro(p_projeto) then
    raise exception 'Você não tem acesso a este projeto.' using errcode = '42501';
  end if;
  if char_length(v_nome) not between 1 and 60 then
    raise exception 'Dê um nome à chave (até 60 caracteres), por exemplo "Claude do Jorge".' using errcode = '22023';
  end if;
  if p_dias is not null and p_dias not in (30, 90) then
    raise exception 'Validade inválida.' using errcode = '22023';
  end if;
  if (select count(*) from public.api_chaves where projeto_id = p_projeto and criado_por = v_usuario and revogada_em is null) >= 5 then
    raise exception 'Você já tem 5 chaves ativas neste projeto. Revogue uma antes de criar outra.' using errcode = '22023';
  end if;

  -- 64 caracteres hexadecimais aleatórios (dois UUID v4).
  v_chave := 'shp_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.api_chaves (projeto_id, criado_por, nome, prefixo, hash, expira_em)
  values (p_projeto, v_usuario, v_nome, left(v_chave, 10),
          encode(sha256(convert_to(v_chave, 'UTF8')), 'hex'),
          case when p_dias is null then null else now() + make_interval(days => p_dias) end);
  return v_chave;
end;
$$;

create or replace function public.revogar_chave_api(p_chave uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.api_chaves set revogada_em = now()
  where id = p_chave and criado_por = (select auth.uid()) and revogada_em is null;
  if not found then
    raise exception 'Chave não encontrada.' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------- uso pela API (sem login, com a chave)

-- Confere a chave e passa a agir como quem a criou (só nesta transação). Interna: não é exposta.
create or replace function public.api_entrar(p_chave text)
returns table (usuario uuid, projeto uuid, funcao text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.api_chaves%rowtype;
  v_funcao text;
begin
  if p_chave is null or p_chave !~ '^shp_[0-9a-f]{64}$' then
    raise exception 'Chave da API inválida.' using errcode = '28000';
  end if;
  select * into v from public.api_chaves where hash = encode(sha256(convert_to(p_chave, 'UTF8')), 'hex');
  if not found or v.revogada_em is not null then
    raise exception 'Chave da API inválida ou revogada.' using errcode = '28000';
  end if;
  if v.expira_em is not null and v.expira_em < now() then
    raise exception 'Chave da API expirada. Gere outra na aba Projeto.' using errcode = '28000';
  end if;
  select m.funcao into v_funcao from public.membros m where m.projeto_id = v.projeto_id and m.usuario_id = v.criado_por;
  if v_funcao is null then
    raise exception 'Quem criou esta chave não faz mais parte do projeto.' using errcode = '28000';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v.criado_por, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v.criado_por::text, true);
  -- Último uso no máximo a cada minuto (evita uma escrita por chamada).
  update public.api_chaves set ultimo_uso_em = now()
  where id = v.id and (ultimo_uso_em is null or ultimo_uso_em < now() - interval '1 minute');
  return query select v.criado_por, v.projeto_id, v_funcao;
end;
$$;
revoke all on function public.api_entrar(text) from public, anon, authenticated;

-- Tudo o que a API lê, de uma vez: projeto, metas, Sprints, time, cartões (com checklist) e movimentos.
create or replace function public.api_dados(p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  select * into c from public.api_entrar(p_chave);
  return jsonb_build_object(
    'eu', jsonb_build_object('id', c.usuario, 'funcao', c.funcao,
      'nome', (select p.nome from public.perfis p where p.id = c.usuario)),
    'projeto', (select jsonb_build_object('id', p.id, 'nome', p.nome, 'wip_andamento', p.wip_andamento, 'wip_revisao', p.wip_revisao,
                  'meta_lead_dias', p.meta_lead_dias, 'meta_cycle_horas', p.meta_cycle_horas, 'meta_velocity', p.meta_velocity,
                  'cliente', p.cliente, 'objetivo', p.objetivo, 'data_inicio', p.data_inicio, 'data_entrega', p.data_entrega)
                from public.projetos p where p.id = c.projeto),
    'sprints', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'numero', s.numero, 'inicio', s.inicio, 'fim', s.fim,
                  'meta', s.meta, 'encerrada', s.encerrada) order by s.numero)
                from public.sprints s where s.projeto_id = c.projeto), '[]'::jsonb),
    'time', coalesce((select jsonb_agg(jsonb_build_object('id', m.usuario_id, 'nome', coalesce(pf.nome, ''), 'funcao', m.funcao) order by pf.nome)
                from public.membros m left join public.perfis pf on pf.id = m.usuario_id where m.projeto_id = c.projeto), '[]'::jsonb),
    'cartoes', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'titulo', k.titulo, 'pontos', k.pontos, 'coluna', k.coluna_atual,
                  'criado_em', k.criado_em, 'sprint_id', k.sprint_id, 'descricao', k.descricao, 'responsavel_id', k.responsavel_id,
                  'horas_estimadas', k.horas_estimadas, 'bloqueado', k.bloqueado, 'motivo_bloqueio', k.motivo_bloqueio,
                  'checklist', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'texto', i.texto, 'feito', i.feito) order by i.criado_em)
                                from public.checklist_itens i where i.cartao_id = k.id), '[]'::jsonb)) order by k.criado_em)
                from public.cartoes k where k.projeto_id = c.projeto), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('cartao_id', e.cartao_id, 'de', e.de_coluna, 'para', e.para_coluna, 'em', e.em) order by e.em)
                from public.eventos e join public.cartoes k on k.id = e.cartao_id where k.projeto_id = c.projeto), '[]'::jsonb)
  );
end;
$$;

-- Ações de escrita. Cada uma chama a função que o site já usa, então valem as mesmas regras
-- (papel, limite de WIP, tamanho dos textos). p_args é um objeto JSON com os campos da ação.
create or replace function public.api_executar(p_chave text, p_acao text, p_args jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_cartao uuid;
  v_item uuid;
  r jsonb;
begin
  select * into c from public.api_entrar(p_chave);
  if jsonb_typeof(coalesce(p_args, '{}'::jsonb)) <> 'object' then
    raise exception 'Os argumentos precisam ser um objeto JSON.' using errcode = '22023';
  end if;

  -- Toda ação sobre um cartão confere que ele é do projeto da chave.
  if p_args ? 'cartao' then
    if coalesce(p_args->>'cartao', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Informe o id do cartão (uuid).' using errcode = '22023';
    end if;
    v_cartao := (p_args->>'cartao')::uuid;
    if public.projeto_do_cartao(v_cartao) is distinct from c.projeto then
      raise exception 'Cartão não encontrado neste projeto.' using errcode = '42501';
    end if;
  end if;

  case p_acao
    when 'criar_cartao' then
      -- Com horas ou responsável, usa a criação completa (que exige as horas); sem, a simples.
      if p_args ? 'horas' or p_args ? 'responsavel' then
        r := public.criar_cartao_completo(
          c.projeto, p_args->>'titulo', coalesce((p_args->>'pontos')::integer, 0), coalesce(p_args->>'coluna', 'Backlog'),
          p_args->>'descricao', (p_args->>'horas')::numeric, (p_args->>'responsavel')::uuid,
          coalesce((p_args->>'confirmar_wip')::boolean, false));
      else
        r := public.criar_cartao_na_coluna(
          c.projeto, p_args->>'titulo', coalesce((p_args->>'pontos')::integer, 0), coalesce(p_args->>'coluna', 'Backlog'),
          p_args->>'descricao', coalesce((p_args->>'confirmar_wip')::boolean, false));
      end if;
    when 'mover_cartao' then
      r := public.mover_cartao(v_cartao, p_args->>'coluna', coalesce((p_args->>'confirmar_wip')::boolean, false));
    when 'editar_cartao' then
      -- Horas só passam pela edição completa (que exige um valor); título e pontos, pela simples.
      if p_args ? 'horas' then
        perform public.editar_cartao_completo(
          v_cartao,
          coalesce(p_args->>'titulo', (select titulo from public.cartoes where id = v_cartao)),
          coalesce((p_args->>'pontos')::integer, (select pontos from public.cartoes where id = v_cartao)),
          (p_args->>'horas')::numeric);
      elsif p_args ? 'titulo' or p_args ? 'pontos' then
        perform public.editar_cartao(
          v_cartao,
          coalesce(p_args->>'titulo', (select titulo from public.cartoes where id = v_cartao)),
          coalesce((p_args->>'pontos')::integer, (select pontos from public.cartoes where id = v_cartao)));
      end if;
      if p_args ? 'descricao' then
        perform public.salvar_descricao(v_cartao, p_args->>'descricao');
      end if;
      if p_args ? 'responsavel' then
        perform public.definir_responsavel(v_cartao, (p_args->>'responsavel')::uuid);
      end if;
      r := jsonb_build_object('status', 'ok');
    when 'adicionar_checklist' then
      r := jsonb_build_object('status', 'ok', 'item', public.adicionar_item_checklist(v_cartao, p_args->>'texto'));
    when 'marcar_checklist' then
      v_item := (p_args->>'item')::uuid;
      if (select i.cartao_id from public.checklist_itens i where i.id = v_item) is distinct from v_cartao then
        raise exception 'Item não encontrado neste cartão.' using errcode = '42501';
      end if;
      perform public.marcar_item_checklist(v_item, coalesce((p_args->>'feito')::boolean, true));
      r := jsonb_build_object('status', 'ok');
    else
      raise exception 'Ação desconhecida: %.', left(p_acao, 40) using errcode = '22023';
  end case;
  return coalesce(r, jsonb_build_object('status', 'ok'));
end;
$$;

revoke all on function public.criar_chave_api(uuid, text, integer) from public, anon;
revoke all on function public.revogar_chave_api(uuid) from public, anon;
revoke all on function public.api_dados(text) from public;
revoke all on function public.api_executar(text, text, jsonb) from public;
grant execute on function public.criar_chave_api(uuid, text, integer) to authenticated;
grant execute on function public.revogar_chave_api(uuid) to authenticated;
grant execute on function public.api_dados(text) to anon, authenticated;
grant execute on function public.api_executar(text, text, jsonb) to anon, authenticated;
