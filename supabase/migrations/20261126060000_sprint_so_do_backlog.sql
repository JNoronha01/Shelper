-- A Sprint volta a nascer só do Backlog (decisão do PO em 26/11).
--
-- O interruptor "Sprint com cartões fora do Backlog" (migração 20261126050000) saiu do site:
-- deixava o planejamento confuso e abria espaço para erro. As colunas e funções ficam no banco
-- (as migrações são só aditivas), mas ninguém mais consegue usá-las pelo site nem pela API:
-- - o interruptor volta a ficar desligado em todos os projetos;
-- - as três funções deixam de poder ser chamadas por quem está logado.
-- A coluna sprints.fora_do_backlog continua valendo: marca a Sprint 3 do projeto Shelper, ligada
-- uma única vez aos cartões feitos antes de ela existir, e o aviso aparece nas métricas e no PDF.

update public.projetos set sprint_fora_backlog = false where sprint_fora_backlog;

revoke execute on function public.definir_sprint_fora_backlog(uuid, boolean) from authenticated;
revoke execute on function public.puxar_cartoes_flex(uuid, uuid[]) from authenticated;
revoke execute on function public.criar_sprint_flex(uuid, date, date, text, uuid[]) from authenticated;
