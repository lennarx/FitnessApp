-- Free-text meal log. structured_text/portion_grams are populated later by
-- the Phase 4 LLM parser; parse_status tracks that lifecycle without ever
-- risking data loss (raw_text is always saved immediately).
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  raw_text text not null,
  structured_text text,
  portion_raw text,
  portion_grams numeric,
  training_day_flag boolean not null default false,
  parse_status text not null default 'unparsed' check (parse_status in ('unparsed', 'pending_parse', 'parsed'))
);

alter table public.meals enable row level security;

create policy "meals_owner_access" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists meals_user_id_idx on public.meals(user_id);
create index if not exists meals_occurred_at_idx on public.meals(occurred_at);
