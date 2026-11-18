-- Segurança: o Supabase Advisor apontou que public.rls_auto_enable()
-- (função do event trigger "ensure_rls", que liga o RLS sozinho em toda
-- tabela nova do schema public) podia ser chamada por anon e authenticated
-- via /rest/v1/rpc. Ela só deve rodar pelo event trigger, que não depende
-- deste EXECUTE. Migration aditiva: não mexe em tabela nem em dado.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
