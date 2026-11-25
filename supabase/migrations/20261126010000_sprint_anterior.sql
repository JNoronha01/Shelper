-- Sprint anterior: o PO ou o SM registra uma Sprint que já aconteceu (por exemplo, as Sprints
-- feitas no Trello antes de importar o board). Ela já nasce encerrada e recebe os cartões
-- concluídos dentro das datas dela. Só acrescenta uma função.

create or replace function public.registrar_sprint_anterior(p_projeto uuid, p_inicio date, p_fim date, p_meta text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta text;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_numero integer;
  v_id uuid;
  v_cartoes integer;
  s record;
begin
  perform public.exigir_funcao(p_projeto, array['po','sm'], 'Só o PO e o SM registram Sprints.');
  v_meta := public.validar_sprint(p_inicio, p_fim, p_meta);
  if p_fim >= v_hoje then
    raise exception 'Uma Sprint anterior precisa ter terminado antes de hoje.' using errcode = '22023';
  end if;

  perform 1 from public.projetos where id = p_projeto for update;
  if exists (
    select 1 from public.sprints
    -- Uma Sprint pode começar no dia em que a outra termina (ex.: 10/11–17/11 e 17/11–24/11).
    where projeto_id = p_projeto and daterange(inicio, fim, '[)') && daterange(p_inicio, p_fim, '[)')
  ) then
    raise exception 'As datas se cruzam com outra Sprint do projeto.' using errcode = '22023';
  end if;

  -- O número segue a ordem das datas: as Sprints que começam depois andam uma posição.
  select count(*) + 1 into v_numero from public.sprints where projeto_id = p_projeto and inicio < p_inicio;
  for s in select id from public.sprints where projeto_id = p_projeto and inicio > p_inicio order by numero desc loop
    update public.sprints set numero = numero + 1 where id = s.id;
  end loop;

  insert into public.sprints (projeto_id, numero, inicio, fim, meta, encerrada)
  values (p_projeto, v_numero, p_inicio, p_fim, v_meta, true)
  returning id into v_id;

  -- Cartões sem Sprint, concluídos (última entrada em Concluído) dentro das datas, no horário de Brasília.
  with concluidos as (
    select c.id
    from public.cartoes c
    where c.projeto_id = p_projeto
      and c.sprint_id is null
      and c.coluna_atual = 'Concluído'
      and (
        select (max(e.em) at time zone 'America/Sao_Paulo')::date
        from public.eventos e
        where e.cartao_id = c.id and e.para_coluna = 'Concluído'
      ) between p_inicio and p_fim
  )
  update public.cartoes set sprint_id = v_id where id in (select id from concluidos);
  get diagnostics v_cartoes = row_count;

  return jsonb_build_object('id', v_id, 'numero', v_numero, 'cartoes', v_cartoes);
end;
$$;

revoke all on function public.registrar_sprint_anterior(uuid, date, date, text) from public, anon;
grant execute on function public.registrar_sprint_anterior(uuid, date, date, text) to authenticated;
