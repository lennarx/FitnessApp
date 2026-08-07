-- Daily metrics (sleep, feeling, steps), one row per day, covering rest
-- days too — deliberately separate from training_sessions.notes.
create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  metric_date date not null,
  sleep_hours numeric,
  feeling_1_10 integer,
  steps integer,
  unique (user_id, metric_date)
);

alter table public.daily_metrics enable row level security;

create policy "daily_metrics_owner_access" on public.daily_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists daily_metrics_user_id_idx on public.daily_metrics(user_id);
create index if not exists daily_metrics_metric_date_idx on public.daily_metrics(metric_date);
