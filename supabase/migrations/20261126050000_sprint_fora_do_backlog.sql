-- Planejar a Sprint com cartões de fora do Backlog.
--
-- O normal no Scrum é a Sprint nascer de cartões do Backlog, que vão para "A fazer".
-- Quando o time começou a trabalhar antes de criar a Sprint (por exemplo, logo depois de
-- importar o board), os cartões já estão em outras colunas e o Planejar Sprint não os vê.
--
-- Esta migração é só aditiva (as versões congeladas usam o mesmo banco):
-- - projetos.sprint_fora_backlog: interruptor na aba Projeto, desligado por padrão, PO e SM mudam.
-- - sprints.fora_do_backlog: marca a Sprint que recebeu algum desses cartões, para o aviso
--   nas métricas e no relatório.
-- - puxar_cartoes_flex / criar_sprint_flex: aceitam cartões do Backlog (como antes, vão para
--   "A fazer") e, com o interruptor ligado, cartões sem Sprint de outras colunas, que ficam onde
--   estão (sem evento novo, então Lead Time e Cycle Time não mudam).
-- Não entra cartão que chegou em Concluído antes do início da Sprint: seria trabalho de antes
-- contado como se fosse da Sprint.
-- As funções antigas (criar_sprint, puxar_cartoes_para_sprint) continuam iguais.

alter table public.projetos add column if not exists sprint_fora_backlog boolean not null default false;
alter table public.sprints add column if not exists fora_do_backlog boolean not null default false;

create or replace function public.definir_sprint_fora_backlog(p_projeto uuid, p_ligado boolean)
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
  perform public.exigir_funcao(p_projeto, array['po','sm'], 'Só o PO e o SM mudam as regras da Sprint.');
  update public.projetos set sprint_fora_backlog = coalesce(p_ligado, false) where id = p_projeto;
end;
$$;

create or replace function public.puxar_cartoes_flex(p_sprint uuid, p_cartoes uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projeto uuid;
  v_inicio date;
  v_liberado boolean;
  v_backlog integer := 0;
  v_fora integer := 0;
  v_fora_ids uuid[];
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  select s.projeto_id, s.inicio, p.sprint_fora_backlog
    into v_projeto, v_inicio, v_liberado
    from public.sprints s join public.projetos p on p.id = s.projeto_id
   where s.id = p_sprint;
  if v_projeto is null or not public.eh_membro(v_projeto) then
    raise exception 'Você não tem acesso a esta Sprint.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(v_projeto, array['po','sm'], 'Só o PO e o SM montam a Sprint.');
  if p_cartoes is null or coalesce(array_length(p_cartoes, 1), 0) = 0 then
    return jsonb_build_object('backlog', 0, 'fora', 0);
  end if;

  -- Cartões do Backlog: o caminho de sempre (vão para "A fazer", com evento).
  v_backlog := public.puxar_cartoes_para_sprint(p_sprint, p_cartoes);

  -- Os outros cartões pedidos, sem Sprint e fora do Backlog.
  select array_agg(c.id) into v_fora_ids
    from public.cartoes c
   where c.id = any (p_cartoes)
     and c.projeto_id = v_projeto
     and c.sprint_id is null
     and c.coluna_atual <> 'Backlog';

  if v_fora_ids is not null then
    if not coalesce(v_liberado, false) then
      raise exception 'Este projeto só puxa cartões do Backlog. Ligue "Sprint com cartões fora do Backlog" na aba Projeto.'
        using errcode = '22023';
    end if;
    -- Concluído antes do início da Sprint (dia de Brasília) não entra.
    if exists (
      select 1
        from public.cartoes c
       where c.id = any (v_fora_ids)
         and c.coluna_atual = 'Concluído'
         and (
           select max(e.em) from public.eventos e where e.cartao_id = c.id and e.para_coluna = 'Concluído'
         ) at time zone 'America/Sao_Paulo' < v_inicio::timestamp
    ) then
      raise exception 'Há cartão concluído antes do início da Sprint. Ele não pode entrar nela.' using errcode = '22023';
    end if;

    update public.cartoes set sprint_id = p_sprint where id = any (v_fora_ids);
    get diagnostics v_fora = row_count;
    if v_fora > 0 then
      update public.sprints set fora_do_backlog = true where id = p_sprint;
    end if;
  end if;

  return jsonb_build_object('backlog', v_backlog, 'fora', v_fora);
end;
$$;

create or replace function public.criar_sprint_flex(
  p_projeto uuid, p_inicio date, p_fim date, p_meta text, p_cartoes uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- criar_sprint confere login, papel, datas e se já há Sprint ativa.
  v_id := public.criar_sprint(p_projeto, p_inicio, p_fim, p_meta, '{}');
  perform public.puxar_cartoes_flex(v_id, p_cartoes);
  return v_id;
end;
$$;

revoke all on function public.definir_sprint_fora_backlog(uuid, boolean) from public, anon;
revoke all on function public.puxar_cartoes_flex(uuid, uuid[]) from public, anon;
revoke all on function public.criar_sprint_flex(uuid, date, date, text, uuid[]) from public, anon;
grant execute on function public.definir_sprint_fora_backlog(uuid, boolean) to authenticated;
grant execute on function public.puxar_cartoes_flex(uuid, uuid[]) to authenticated;
grant execute on function public.criar_sprint_flex(uuid, date, date, text, uuid[]) to authenticated;
