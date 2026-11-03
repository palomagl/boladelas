-- Rode uma única vez no Supabase > SQL Editor antes de utilizar saídas.
-- Atualiza movimentações existentes: todos os lançamentos anteriores continuam como entrada.
alter table public.cash_entries
  add column if not exists entry_type text not null default 'income';
alter table public.cash_entries
  drop constraint if exists cash_entries_entry_type_check;
alter table public.cash_entries
  add constraint cash_entries_entry_type_check
  check (entry_type in ('income','expense'));
comment on column public.cash_entries.entry_type is 'income = entrada; expense = saída';
