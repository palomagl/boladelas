-- BolaDelas: estrutura inicial para Supabase (executar no SQL Editor)
-- Cada usuária autenticada tem acesso apenas aos seus próprios registros.
create table if not exists public.players (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 aliases text[] not null default '{}',
 created_at timestamptz not null default now()
);
create table if not exists public.matches (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 played_on date not null,
 fee_cents integer not null default 0 check (fee_cents>=0),
 created_at timestamptz not null default now(),
 unique(owner_id,played_on)
);
create table if not exists public.match_players (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 match_id uuid not null references public.matches(id) on delete cascade,
 player_id uuid not null references public.players(id) on delete cascade,
 present boolean not null default true,
 goals integer not null default 0 check(goals>=0),
 payment_method text not null default 'pending' check(payment_method in ('pending','pix','cash')),
 verified boolean not null default false,
 unique(match_id,player_id)
);
create table if not exists public.cash_entries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 entry_date date not null,
 description text not null check(length(trim(description))>0),
 amount_cents integer not null check(amount_cents>0),
 payment_method text not null check(payment_method in ('pix','cash')),
 created_at timestamptz not null default now()
);
-- Política: além de RLS, impedir vínculos entre registros de donos diferentes.
create or replace function public.boladelas_check_entry_owner()
returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.matches m where m.id=new.match_id and m.owner_id=new.owner_id)
 or not exists(select 1 from public.players p where p.id=new.player_id and p.owner_id=new.owner_id) then
 raise exception 'Jogadora e rodada devem pertencer à mesma conta';
 end if;
 return new;
end $$;
drop trigger if exists boladelas_entry_owner on public.match_players;
create trigger boladelas_entry_owner before insert or update on public.match_players
for each row execute function public.boladelas_check_entry_owner();
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.cash_entries enable row level security;
drop policy if exists owner_players on public.players;
drop policy if exists owner_matches on public.matches;
drop policy if exists owner_match_players on public.match_players;
drop policy if exists owner_cash_entries on public.cash_entries;
create policy owner_players on public.players for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_matches on public.matches for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_match_players on public.match_players for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_cash_entries on public.cash_entries for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create index if not exists players_owner_idx on public.players(owner_id);
create index if not exists matches_owner_date_idx on public.matches(owner_id,played_on);
create index if not exists match_players_owner_idx on public.match_players(owner_id,match_id);
create index if not exists cash_owner_date_idx on public.cash_entries(owner_id,entry_date);
