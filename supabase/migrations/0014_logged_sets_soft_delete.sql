-- Un set mal cargado se corrige en el momento, mientras la sesión sigue
-- abierta. El sync es push-only (upsert on id, sin canal de delete), así que
-- "borrar" es un update de campo más — mismo patrón que 0013 en routines.
alter table public.logged_sets add column deleted_at timestamptz;
