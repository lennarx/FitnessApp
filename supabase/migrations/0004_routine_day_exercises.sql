-- Target sets/reps/RIR/rest for each exercise within a routine day.
create table if not exists public.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_order integer not null default 0,
  target_sets integer not null,
  target_reps_min integer not null,
  target_reps_max integer not null,
  target_rir numeric,
  rest_seconds integer,
  progression_notes text
);

alter table public.routine_day_exercises enable row level security;

create policy "routine_day_exercises_owner_access" on public.routine_day_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists routine_day_exercises_user_id_idx on public.routine_day_exercises(user_id);
create index if not exists routine_day_exercises_routine_day_id_idx on public.routine_day_exercises(routine_day_id);
create index if not exists routine_day_exercises_exercise_id_idx on public.routine_day_exercises(exercise_id);
