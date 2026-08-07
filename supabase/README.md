# Supabase migrations

11 SQL files in `migrations/`, applied in numeric order. Every table follows the same pattern: `id uuid` (client-generated, doubles as the Dexie `local_id`), `user_id uuid` (owner, FK to `auth.users`), RLS enabled with a single `FOR ALL` owner-access policy.

## Apply via Supabase CLI (recommended)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## Apply via psql (no CLI link needed)

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_exercises.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_routines.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_routine_days.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0004_routine_day_exercises.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0005_training_sessions.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0006_logged_sets.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0007_cardio_sessions.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0008_meals.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0009_body_weight.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0010_daily_metrics.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0011_test_records.sql
```

`SUPABASE_DB_URL` is the Postgres connection string from Project Settings → Database → Connection string (URI).

## Verifying RLS after applying

In the Supabase SQL editor:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r';
```

Every row should show `relrowsecurity = true`.
