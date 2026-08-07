-- Phase 1 scaffolding only, to demonstrate the full local-write -> sync ->
-- Supabase loop end to end. Safe to drop once Phase 2 feature screens land.
create table if not exists public.test_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  note text not null
);

alter table public.test_records enable row level security;

create policy "test_records_owner_access" on public.test_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists test_records_user_id_idx on public.test_records(user_id);
