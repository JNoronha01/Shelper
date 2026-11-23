-- Cartão com responsável, horas estimadas e bloqueio (pedido do professor em 21/11):
-- o gargalo é o cartão que passou do tempo estimado desde que entrou em Em andamento,
-- e o gestor precisa ver "quem, o quê e por quê".
--
-- Aditiva: colunas novas aceitam vazio (cartões antigos e a versão da Sprint 1 não as
-- preenchem). O site novo exige as horas estimadas ao criar o cartão.

alter table public.cartoes add column if not exists responsavel_id uuid references auth.users (id) on delete set null;
alter table public.cartoes add column if not exists horas_estimadas numeric(6, 1);
alter table public.cartoes add column if not exists bloqueado boolean not null default false;
alter table public.cartoes add column if not exists motivo_bloqueio text;
alter table public.cartoes add column if not exists bloqueado_em timestamptz;

alter table public.cartoes drop constraint if exists cartoes_horas_validas;
alter table public.cartoes add constraint cartoes_horas_validas check (horas_estimadas is null or horas_estimadas between 0.5 and 1000);
alter table public.cartoes drop constraint if exists cartoes_bloqueio_valido;
alter table public.cartoes add constraint cartoes_bloqueio_valido check (
  (not bloqueado and motivo_bloqueio is null) or (bloqueado and char_length(btrim(motivo_bloqueio)) between 1 and 300)
);
create index if not exists cartoes_responsavel_idx on public.cartoes (responsavel_id);

-- Outros acontecimentos do cartão que aparecem no Histórico (os movimentos entre colunas
-- continuam na tabela eventos, que é a base das métricas).
create table if not exists public.atividades (
  id bigint generated always as identity primary key,
  cartao_id uuid not null references public.cartoes (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null,
  tipo text not null check (tipo in ('bloqueio', 'desbloqueio', 'responsavel')),
  detalhe text,
  em timestamptz not null default now()
);
create index if not exists atividades_cartao_idx on public.atividades (cartao_id, em desc);
alter table public.atividades enable row level security;
drop policy if exists "atividades: membros leem" on public.atividades;
create policy "atividades: membros leem" on public.atividades
  for select to authenticated using (
    exists (select 1 from public.cartoes c where c.id = atividades.cartao_id and public.eh_membro(c.projeto_id))
  );

-- Confere se a pessoa é do projeto (para ser responsável por um cartão dele).
create or replace function public.eh_membro_de(p_projeto uuid, p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membros where projeto_id = p_projeto and usuario_id = p_usuario);
$$;

create or replace function public.validar_horas(p_horas numeric)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_horas is null or p_horas < 0.5 or p_horas > 1000 then
    raise exception 'Informe as horas estimadas (de 0,5 a 1000).' using errcode = '22023';
  end if;
end;
$$;

-- Criar cartão com tudo: coluna, descrição, horas estimadas e responsável (só o PO).
create or replace function public.criar_cartao_completo(
  p_projeto uuid, p_titulo text, p_pontos integer, p_coluna text, p_descricao text,
  p_horas numeric, p_responsavel uuid, p_confirmar_wip boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO cria cartões.');
  perform public.validar_horas(p_horas);
  if p_responsavel is not null and not public.eh_membro_de(p_projeto, p_responsavel) then
    raise exception 'O responsável precisa ser alguém do projeto.' using errcode = '22023';
  end if;
  r := public.criar_cartao_na_coluna(p_projeto, p_titulo, p_pontos, p_coluna, p_descricao, p_confirmar_wip);
  if r->>'status' = 'ok' then
    update public.cartoes set horas_estimadas = p_horas, responsavel_id = p_responsavel where id = (r->>'id')::uuid;
  end if;
  return r;
end;
$$;

-- Editar título, pontos e horas estimadas (só o PO).
create or replace function public.editar_cartao_completo(p_cartao uuid, p_titulo text, p_pontos integer, p_horas numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.validar_horas(p_horas);
  perform public.editar_cartao(p_cartao, p_titulo, p_pontos);
  update public.cartoes set horas_estimadas = p_horas where id = p_cartao;
end;
$$;

-- Responsável: PO e SM escolhem qualquer pessoa do projeto (ou ninguém).
-- O desenvolvedor só "pega" um cartão sem dono ou "larga" um cartão que é dele.
create or replace function public.definir_responsavel(p_cartao uuid, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := (select auth.uid());
  v_projeto uuid;
  v_atual uuid;
  v_funcao text;
begin
  if v_eu is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id, responsavel_id into v_projeto, v_atual from public.cartoes where id = p_cartao;
  v_funcao := public.minha_funcao(v_projeto);
  if v_projeto is null or v_funcao is null then
    raise exception 'Você não tem acesso a este cartão.' using errcode = '42501';
  end if;
  if p_usuario is not null and not public.eh_membro_de(v_projeto, p_usuario) then
    raise exception 'O responsável precisa ser alguém do projeto.' using errcode = '22023';
  end if;
  if v_funcao = 'dev' then
    if not ((p_usuario = v_eu and v_atual is null) or (p_usuario is null and v_atual = v_eu)) then
      raise exception 'Você pode pegar um cartão sem responsável ou largar um cartão seu. Para outras trocas, fale com o PO ou o SM.' using errcode = '42501';
    end if;
  end if;
  if p_usuario is not distinct from v_atual then
    return;
  end if;
  update public.cartoes set responsavel_id = p_usuario where id = p_cartao;
  insert into public.atividades (cartao_id, usuario_id, tipo, detalhe)
  values (
    p_cartao, v_eu, 'responsavel',
    coalesce((select nome from public.perfis where id = p_usuario), case when p_usuario is null then null else 'Sem nome' end)
  );
end;
$$;

-- Bloqueio com motivo: o responsável, o PO e o SM marcam e desmarcam.
create or replace function public.definir_bloqueio(p_cartao uuid, p_bloqueado boolean, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := (select auth.uid());
  v_projeto uuid;
  v_responsavel uuid;
  v_funcao text;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_eu is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select projeto_id, responsavel_id into v_projeto, v_responsavel from public.cartoes where id = p_cartao;
  v_funcao := public.minha_funcao(v_projeto);
  if v_projeto is null or v_funcao is null then
    raise exception 'Você não tem acesso a este cartão.' using errcode = '42501';
  end if;
  if v_funcao = 'dev' and v_responsavel is distinct from v_eu then
    raise exception 'Só o responsável pelo cartão, o PO ou o SM marcam o bloqueio.' using errcode = '42501';
  end if;
  if coalesce(p_bloqueado, false) then
    if v_motivo is null or char_length(v_motivo) > 300 then
      raise exception 'Escreva o motivo do bloqueio (até 300 caracteres).' using errcode = '22023';
    end if;
    update public.cartoes set bloqueado = true, motivo_bloqueio = v_motivo, bloqueado_em = now() where id = p_cartao;
    insert into public.atividades (cartao_id, usuario_id, tipo, detalhe) values (p_cartao, v_eu, 'bloqueio', v_motivo);
  else
    update public.cartoes set bloqueado = false, motivo_bloqueio = null, bloqueado_em = null where id = p_cartao and bloqueado;
    if found then
      insert into public.atividades (cartao_id, usuario_id, tipo) values (p_cartao, v_eu, 'desbloqueio');
    end if;
  end if;
end;
$$;

-- Histórico único (movimentos + outras atividades), para filtrar e paginar no banco.
-- security_invoker: a view respeita o RLS de quem consulta (só projetos dos quais é membro).
create or replace view public.historico
with (security_invoker = true) as
  select 'e' || e.id::text as id, 'movimento'::text as tipo, c.projeto_id, e.cartao_id, c.titulo as cartao_titulo,
         e.usuario_id, e.de_coluna, e.para_coluna, e.acima_do_wip, null::text as detalhe, e.em
    from public.eventos e
    join public.cartoes c on c.id = e.cartao_id
  union all
  select 'a' || a.id::text, a.tipo, c.projeto_id, a.cartao_id, c.titulo,
         a.usuario_id, null, null, false, a.detalhe, a.em
    from public.atividades a
    join public.cartoes c on c.id = a.cartao_id;

revoke all on public.historico from anon;
grant select on public.historico to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.criar_cartao_completo(uuid, text, integer, text, text, numeric, uuid, boolean)',
    'public.editar_cartao_completo(uuid, text, integer, numeric)',
    'public.definir_responsavel(uuid, uuid)',
    'public.definir_bloqueio(uuid, boolean, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

revoke execute on function public.eh_membro_de(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.validar_horas(numeric) from public, anon, authenticated;
