-- Planta dos ambientes · estrutura do banco (Supabase)
-- Rode uma vez no SQL Editor do projeto. Pode rodar de novo sem quebrar nada.

-- Planta atual: um único registro ('principal') com a planta e o quadro de aulas em JSON.
create table if not exists public.planta (
  id            text primary key default 'principal',
  dados         jsonb not null,
  versao        integer not null default 1,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

-- Cada salvamento gera uma linha aqui (permite ver e restaurar versões antigas).
create table if not exists public.planta_historico (
  id        bigint generated always as identity primary key,
  versao    integer not null,
  dados     jsonb not null,
  salvo_em  timestamptz not null default now(),
  salvo_por text
);
create index if not exists planta_historico_versao on public.planta_historico (versao desc);

-- Quem pode editar: e-mails dos usuários criados em Authentication › Users.
create table if not exists public.editores (
  email text primary key
);

alter table public.planta enable row level security;
alter table public.planta_historico enable row level security;
alter table public.editores enable row level security;

-- Permissões explícitas (não dependem da opção "expor tabelas automaticamente"):
-- visitantes só leem a planta; gravar só pela função salvar_planta.
revoke all on public.planta, public.planta_historico, public.editores from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.planta to anon, authenticated;
grant select on public.planta_historico, public.editores to authenticated;

create or replace function public.eh_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editores where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.eh_editor() to anon, authenticated;

-- Leitura pública da planta (link de visualização e telão). Escrita só pela função salvar_planta.
drop policy if exists "planta: leitura pública" on public.planta;
create policy "planta: leitura pública" on public.planta for select to anon, authenticated using (true);

drop policy if exists "histórico: editores leem" on public.planta_historico;
create policy "histórico: editores leem" on public.planta_historico for select to authenticated using (public.eh_editor());

drop policy if exists "editores: cada um vê o próprio e-mail" on public.editores;
create policy "editores: cada um vê o próprio e-mail" on public.editores for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Salva uma nova versão se ninguém salvou desde a versão que o editor abriu (p_versao).
-- Erros: 42501 = usuário não é editor; 40001 = conflito (outra pessoa salvou antes).
create or replace function public.salvar_planta(p_dados jsonb, p_versao integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_nova  integer;
begin
  if not public.eh_editor() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_dados is null or jsonb_typeof(p_dados -> 'locais') is distinct from 'object' then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  if not exists (select 1 from public.planta where id = 'principal') then
    insert into public.planta (id, dados, versao, atualizado_por) values ('principal', p_dados, 1, v_email);
    v_nova := 1;
  else
    update public.planta p
       set dados = p_dados, versao = p.versao + 1, atualizado_em = now(), atualizado_por = v_email
     where p.id = 'principal' and p.versao = p_versao
    returning p.versao into v_nova;
    if v_nova is null then
      raise exception 'conflito' using errcode = '40001';
    end if;
  end if;

  insert into public.planta_historico (versao, dados, salvo_por) values (v_nova, p_dados, v_email);
  return jsonb_build_object('versao', v_nova, 'atualizado_em', now());
end;
$$;
revoke all on function public.salvar_planta(jsonb, integer) from public, anon;
grant execute on function public.salvar_planta(jsonb, integer) to authenticated;

-- Realtime: o telão e quem estiver com o link aberto recebem a nova versão na hora.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planta') then
    alter publication supabase_realtime add table public.planta;
  end if;
end $$;

-- Fotos do croqui: bucket público para leitura; só editores enviam.
insert into storage.buckets (id, name, public) values ('croquis', 'croquis', true) on conflict (id) do nothing;
drop policy if exists "croquis: editores enviam" on storage.objects;
create policy "croquis: editores enviam" on storage.objects for insert to authenticated
  with check (bucket_id = 'croquis' and public.eh_editor());
