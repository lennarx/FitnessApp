-- Routine (a named Upper/Lower plan).
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  is_active boolean not null default true
);

alter table public.routines enable row level security;

create policy "routines_owner_access" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists routines_user_id_idx on public.routines(user_id);
