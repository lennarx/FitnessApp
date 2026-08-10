-- Un registro mal cargado (o duplicado por doble tap en el peso) se corrige
-- en el momento. El sync es push-only (upsert on id, sin canal de delete),
-- así que "borrar" es un update de campo más — mismo patrón que 0013/0014.
alter table public.meals add column deleted_at timestamptz;
alter table public.body_weight add column deleted_at timestamptz;
