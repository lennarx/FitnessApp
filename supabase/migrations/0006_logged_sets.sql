-- A single logged set within a training session. Loads can be non-numeric
-- ("+10 kg de lastre", "40 kg/lado", "I10-D10"), so the raw string is always
-- kept alongside a best-effort nullable numeric normalization.
create table if not exists public.logged_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  set_order integer not null default 0,
  reps integer not null,
  rir numeric,
  load_raw text not null,
  load_normalized_kg numeric
);

alter table public.logged_sets enable row level security;

create policy "logged_sets_owner_access" on public.logged_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists logged_sets_user_id_idx on public.logged_sets(user_id);
create index if not exists logged_sets_training_session_id_idx on public.logged_sets(training_session_id);
create index if not exists logged_sets_exercise_id_idx on public.logged_sets(exercise_id);
