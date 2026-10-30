create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  qty numeric not null check (qty > 0),
  avg_cost numeric not null check (avg_cost >= 0),
  bought_on date not null,
  created_at timestamptz not null default now()
);

alter table public.holdings enable row level security;

drop policy if exists "holdings_select_own" on public.holdings;
drop policy if exists "holdings_insert_own" on public.holdings;
drop policy if exists "holdings_delete_own" on public.holdings;

create policy "holdings_select_own"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "holdings_insert_own"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "holdings_delete_own"
  on public.holdings for delete
  using (auth.uid() = user_id);
