/**
 * Tables synced local -> Supabase. Local (Dexie) and remote (Supabase)
 * table names are identical by design, so this is just the shared list —
 * both lib/db/schema.ts and the sync engine iterate it.
 */
export const SYNCED_TABLES = [
  "exercises",
  "routines",
  "routine_days",
  "routine_day_exercises",
  "training_sessions",
  "logged_sets",
  "cardio_sessions",
  "meals",
  "body_weight",
  "daily_metrics",
  "nl_inbox",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];
