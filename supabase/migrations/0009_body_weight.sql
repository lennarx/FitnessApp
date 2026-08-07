-- Body weight, logged roughly every 3 days per the brief. Always a plain
-- number on a scale, so no raw/normalized split (unlike training loads).
create table if not exists public.body_weight (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  measured_at date not null,
  weight_kg numeric not null,
  notes text
);

alter table public.body_weight enable row level security;

create policy "body_weight_owner_access" on public.body_weight
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists body_weight_user_id_idx on public.body_weight(user_id);
create index if not exists body_weight_measured_at_idx on public.body_weight(measured_at);
