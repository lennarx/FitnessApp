-- The sync engine is push-only (upsert on id, no delete channel). Deleting a
-- routine/day/exercise from the plan is modeled as a regular field update
-- (deleted_at) so it flows through the existing upsert pipeline unchanged.
alter table public.routines add column deleted_at timestamptz;
alter table public.routine_days add column deleted_at timestamptz;
alter table public.routine_day_exercises add column deleted_at timestamptz;
