-- A single gym session (can be ad-hoc, routine_day_id nullable).
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  routine_day_id uuid references public.routine_days(id) on delete set null,
  session_date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  notes text
);

alter table public.training_sessions enable row level security;

create policy "training_sessions_owner_access" on public.training_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists training_sessions_user_id_idx on public.training_sessions(user_id);
create index if not exists training_sessions_session_date_idx on public.training_sessions(session_date);
create index if not exists training_sessions_routine_day_id_idx on public.training_sessions(routine_day_id);
