-- Bandeja de texto crudo sin parsear. El parse por LLM es lo único que
-- necesita red; cuando falla (sin señal, endpoint caído, JSON malformado)
-- el texto se guarda acá y el usuario lo procesa después. Sin FKs a
-- propósito: la fila sobrevive aunque no se sepa todavía a qué ejercicio
-- o comida corresponde.
create table if not exists public.nl_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('sets', 'meal')),
  raw_text text not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'discarded'))
);

alter table public.nl_inbox enable row level security;

create policy "nl_inbox_owner_access" on public.nl_inbox
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists nl_inbox_user_id_idx on public.nl_inbox(user_id);
create index if not exists nl_inbox_status_idx on public.nl_inbox(status);
