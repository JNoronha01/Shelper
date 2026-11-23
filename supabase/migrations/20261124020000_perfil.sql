-- Perfil: editar nome, foto, senha e e-mail (pedido do professor em 21/11: "não tem como
-- editar os dados do usuário?"). Senha e e-mail são do Supabase Auth; aqui ficam a foto,
-- o nome do perfil e a sincronização do e-mail.
-- Aditiva: coluna nova, bucket novo, funções novas.

alter table public.perfis add column if not exists foto text;
alter table public.perfis drop constraint if exists perfis_foto_valida;
alter table public.perfis add constraint perfis_foto_valida check (foto is null or char_length(foto) between 1 and 200);

-- Fotos ficam no Storage, no bucket público "avatares", uma pasta por usuário (avatares/<id>/...).
-- Público para leitura: a foto aparece para o time sem precisar de link assinado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cada pessoa só grava, troca e apaga arquivos na própria pasta.
drop policy if exists "avatares: dono envia" on storage.objects;
create policy "avatares: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatares: dono troca" on storage.objects;
create policy "avatares: dono troca" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatares: dono apaga" on storage.objects;
create policy "avatares: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatares: dono lê" on storage.objects;
create policy "avatares: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Nome e foto do próprio perfil. A foto é o caminho dentro do bucket (avatares/<id>/arquivo).
create or replace function public.salvar_perfil(p_nome text, p_foto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := (select auth.uid());
  v_nome text := btrim(coalesce(p_nome, ''));
begin
  if v_eu is null then
    raise exception 'Entre na sua conta para continuar.' using errcode = '28000';
  end if;
  if char_length(v_nome) not between 2 and 120 then
    raise exception 'O nome precisa ter de 2 a 120 caracteres.' using errcode = '22023';
  end if;
  if p_foto is not null and (p_foto not like v_eu::text || '/%' or char_length(p_foto) > 200) then
    raise exception 'Foto inválida.' using errcode = '22023';
  end if;
  update public.perfis set nome = v_nome, foto = p_foto where id = v_eu;
end;
$$;

-- Quando a pessoa confirma o e-mail novo no Supabase Auth, o perfil acompanha.
create or replace function public.sincronizar_email_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.perfis set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists ao_mudar_email_sincronizar_perfil on auth.users;
create trigger ao_mudar_email_sincronizar_perfil
  after update of email on auth.users
  for each row execute function public.sincronizar_email_do_perfil();

-- Time com a foto de cada um (substitui a versão sem foto).
drop function if exists public.listar_time(uuid);
create function public.listar_time(p_projeto uuid)
returns table (usuario_id uuid, nome text, email text, funcao text, entrou_em timestamptz, foto text)
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
    select m.usuario_id, coalesce(p.nome, 'Sem nome'), coalesce(p.email, ''), m.funcao, m.entrou_em, p.foto
      from public.membros m
      left join public.perfis p on p.id = m.usuario_id
     where m.projeto_id = p_projeto
     order by case m.funcao when 'po' then 0 when 'sm' then 1 else 2 end, m.entrou_em;
end;
$$;

revoke execute on function public.salvar_perfil(text, text) from public, anon;
grant execute on function public.salvar_perfil(text, text) to authenticated;
revoke execute on function public.listar_time(uuid) from public, anon;
grant execute on function public.listar_time(uuid) to authenticated;
revoke execute on function public.sincronizar_email_do_perfil() from public, anon, authenticated;
