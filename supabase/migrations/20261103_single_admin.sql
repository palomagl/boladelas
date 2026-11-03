-- Execute depois de 20261029_initial.sql, no SQL Editor do Supabase.
-- Configuração de acesso exclusivo: uma conta administradora.
-- NÃO insira email, senha nem UUID da administradora neste arquivo versionado.
create schema if not exists private;

create table if not exists private.boladelas_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  singleton boolean not null default true check (singleton),
  unique(singleton)
);
revoke all on schema private from public, anon, authenticated;
revoke all on table private.boladelas_admin from public, anon, authenticated;

create or replace function private.boladelas_is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
 select exists (
   select 1 from private.boladelas_admin
   where user_id = (select auth.uid())
 );
$$;
revoke all on function private.boladelas_is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.boladelas_is_admin() to authenticated;

-- Primeiro removemos as políticas antigas, que aceitavam qualquer usuário
-- autenticado como proprietário de seus próprios dados.
drop policy if exists owner_players on public.players;
drop policy if exists owner_matches on public.matches;
drop policy if exists owner_match_players on public.match_players;
drop policy if exists owner_cash_entries on public.cash_entries;

-- RLS habilitado e acesso anônimo removido mesmo com grants padrão legados.
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.cash_entries enable row level security;

revoke all on public.players, public.matches, public.match_players, public.cash_entries from anon;
revoke all on public.players, public.matches, public.match_players, public.cash_entries from authenticated;
grant select, insert, update, delete on public.players, public.matches, public.match_players, public.cash_entries to authenticated;

-- Privilégios SQL + RLS: a conta precisa ser a administradora autorizada
-- E só pode manipular linhas que pertençam ao próprio auth.uid().
create policy admin_players on public.players for all to authenticated
using (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()))
with check (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()));
create policy admin_matches on public.matches for all to authenticated
using (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()))
with check (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()));
create policy admin_match_players on public.match_players for all to authenticated
using (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()))
with check (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()));
create policy admin_cash_entries on public.cash_entries for all to authenticated
using (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()))
with check (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()));

-- Depois de criar a usuária pelo dashboard Authentication > Users,
-- executar MANUALMENTE no SQL Editor, substituindo o UUID:
-- insert into private.boladelas_admin(user_id) values ('UUID-DA-USUARIA');
-- A restrição unique(singleton) impede cadastrar uma segunda conta admin.
-- Desative novos cadastros e logins anônimos em Authentication > Settings.
