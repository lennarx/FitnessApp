-- Days within a routine (e.g. "Upper A", "Lower B").
create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_label text not null,
  day_order integer not null default 0,
  notes text
);

alter table public.routine_days enable row level security;

create policy "routine_days_owner_access" on public.routine_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists routine_days_user_id_idx on public.routine_days(user_id);
create index if not exists routine_days_routine_id_idx on public.routine_days(routine_id);
