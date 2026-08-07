-- Swim/cardio sessions. Can stand alone or be linked to a training session.
create table if not exists public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  training_session_id uuid references public.training_sessions(id) on delete set null,
  session_date date not null,
  activity_type text not null default 'swim' check (activity_type in ('swim', 'other')),
  duration_minutes integer not null,
  distance_meters integer,
  intensity_raw text,
  intensity_rpe numeric,
  notes text
);

alter table public.cardio_sessions enable row level security;

create policy "cardio_sessions_owner_access" on public.cardio_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists cardio_sessions_user_id_idx on public.cardio_sessions(user_id);
create index if not exists cardio_sessions_session_date_idx on public.cardio_sessions(session_date);
create index if not exists cardio_sessions_training_session_id_idx on public.cardio_sessions(training_session_id);
