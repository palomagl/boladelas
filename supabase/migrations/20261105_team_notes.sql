-- BolaDelas: lembretes da organizadora na parte inferior do Caixa.
-- Execute uma vez no Supabase SQL Editor; mantém RLS e o acesso da conta autorizada.
create table if not exists public.team_notes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 content text not null check (length(trim(content)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists team_notes_owner_created_idx
 on public.team_notes(owner_id,created_at desc);
alter table public.team_notes enable row level security;
revoke all on public.team_notes from anon;
grant select, insert, update, delete on public.team_notes to authenticated;
drop policy if exists admin_team_notes on public.team_notes;
create policy admin_team_notes on public.team_notes for all to authenticated
 using (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()))
 with check (owner_id = (select auth.uid()) and (select private.boladelas_is_admin()));
