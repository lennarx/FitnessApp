-- Exercise catalog (seed + user-created custom exercises).
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name_es text not null,
  name_en text,
  muscle_group text not null,
  equipment text,
  image_url text,
  is_custom boolean not null default false,
  source text not null default 'custom' check (source in ('seed', 'custom'))
);

alter table public.exercises enable row level security;

create policy "exercises_owner_access" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists exercises_user_id_idx on public.exercises(user_id);
