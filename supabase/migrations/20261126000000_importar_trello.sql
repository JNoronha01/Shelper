-- Importação do board a partir do JSON exportado pelo Trello (o PO envia o arquivo na aba Projeto).
-- Só acrescenta: duas colunas novas e uma função. Nada existente muda de comportamento,
-- a não ser o gatilho dos eventos, que passa a aceitar a data original SÓ durante a importação.

-- 1) Marca de origem
alter table public.cartoes add column if not exists origem_trello text;
create unique index if not exists cartoes_origem_trello_unica
  on public.cartoes (projeto_id, origem_trello) where origem_trello is not null;

alter table public.eventos add column if not exists importado boolean not null default false;
comment on column public.eventos.importado is 'Evento recriado a partir do histórico do Trello, com a data original.';

-- 2) Gatilho dos eventos: fora da importação continua igual (hora do servidor, importado = false).
--    A importação liga a variável local shelper.importando só dentro da própria transação.
create or replace function public.eventos_protecao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('shelper.importando', true), '') = 'on' then
      if new.em is null or new.em > now() or new.em < timestamptz '2000-01-01' then
        raise exception 'Data de evento inválida na importação.' using errcode = '22023';
      end if;
      new.importado := true;
    else
      new.em := now();
      new.importado := false;
    end if;
    return new;
  end if;

  -- Única alteração aceita: a exclusão de uma conta zera o autor (on delete set null).
  if tg_op = 'UPDATE'
     and old.usuario_id is not null and new.usuario_id is null
     and (new.id, new.cartao_id, new.de_coluna, new.para_coluna, new.em, new.acima_do_wip, new.importado)
         is not distinct from
         (old.id, old.cartao_id, old.de_coluna, old.para_coluna, old.em, old.acima_do_wip, old.importado) then
    return new;
  end if;

  raise exception 'Eventos não podem ser editados nem apagados.' using errcode = '42501';
end;
$$;

-- 3) Importação. Recebe os cartões já normalizados pela tela (ver src/lib/importacao/trello.ts):
--    [{ origem, titulo, pontos, coluna, descricao, criadoEm, checklist: [{texto, feito}], eventos: [{de, para, em}] }]
--    Cartão que já veio do mesmo cartão do Trello é ignorado: importar de novo não duplica.
create or replace function public.importar_trello(p_projeto uuid, p_cartoes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c jsonb;
  e jsonb;
  i jsonb;
  v_id uuid;
  v_criados int := 0;
  v_ignorados int := 0;
  v_eventos int := 0;
  v_criado_em timestamptz;
begin
  perform public.exigir_funcao(p_projeto, array['po'], 'Só o PO importa cartões.');
  if jsonb_typeof(p_cartoes) <> 'array' or jsonb_array_length(p_cartoes) = 0 then
    raise exception 'Nenhum cartão para importar.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_cartoes) > 500 then
    raise exception 'Importe no máximo 500 cartões por vez.' using errcode = '22023';
  end if;

  perform set_config('shelper.importando', 'on', true);

  for c in select * from jsonb_array_elements(p_cartoes) loop
    if exists (select 1 from public.cartoes where projeto_id = p_projeto and origem_trello = c->>'origem') then
      v_ignorados := v_ignorados + 1;
      continue;
    end if;
    if jsonb_typeof(c->'eventos') <> 'array' or jsonb_array_length(c->'eventos') = 0 then
      raise exception 'Cartão "%" sem eventos.', left(c->>'titulo', 60) using errcode = '22023';
    end if;
    -- Começa no Backlog com a data de criação; a coluna final sai do último evento.
    v_criado_em := (c->>'criadoEm')::timestamptz;
    if v_criado_em > now() or v_criado_em < timestamptz '2000-01-01' then
      raise exception 'Data de criação inválida em "%".', left(c->>'titulo', 60) using errcode = '22023';
    end if;
    insert into public.cartoes (projeto_id, titulo, pontos, coluna_atual, criado_em, descricao, origem_trello)
    values (p_projeto, c->>'titulo', (c->>'pontos')::smallint,
            (c->'eventos'->-1)->>'para', v_criado_em, nullif(c->>'descricao', ''), c->>'origem')
    returning id into v_id;

    for e in select * from jsonb_array_elements(c->'eventos') loop
      insert into public.eventos (cartao_id, de_coluna, para_coluna, em, usuario_id)
      values (v_id, e->>'de', e->>'para', (e->>'em')::timestamptz, null);
      v_eventos := v_eventos + 1;
    end loop;

    for i in select * from jsonb_array_elements(coalesce(c->'checklist', '[]'::jsonb)) loop
      insert into public.checklist_itens (cartao_id, texto, feito, criado_em)
      values (v_id, i->>'texto', coalesce((i->>'feito')::boolean, false), v_criado_em);
    end loop;

    v_criados := v_criados + 1;
  end loop;

  perform set_config('shelper.importando', '', true);
  return jsonb_build_object('criados', v_criados, 'ignorados', v_ignorados, 'eventos', v_eventos);
end;
$$;

revoke all on function public.importar_trello(uuid, jsonb) from public, anon;
grant execute on function public.importar_trello(uuid, jsonb) to authenticated;
