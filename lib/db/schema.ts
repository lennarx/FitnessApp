import type Dexie from "dexie";

/**
 * Dexie store definitions, versioned from v1. Every table indexes `id`
 * (primary key, doubles as the Supabase row id / sync `local_id`) and
 * `synced` (queried by the sync engine and the pending-count UI badge).
 * Additional indexes cover the lookups Phase 1 already needs (e.g. sync
 * push queries, the "last session per exercise" autocomplete planned for
 * Phase 3) without speculating further ahead than the brief describes.
 */
export function applySchema(db: Dexie) {
  db.version(1).stores({
    exercises: "id, synced, user_id, name_es, source",
    routines: "id, synced, user_id, is_active",
    routine_days: "id, synced, user_id, routine_id",
    routine_day_exercises: "id, synced, user_id, routine_day_id, exercise_id",
    training_sessions: "id, synced, user_id, session_date, routine_day_id",
    logged_sets: "id, synced, user_id, training_session_id, exercise_id",
    cardio_sessions: "id, synced, user_id, session_date, training_session_id",
    meals: "id, synced, user_id, occurred_at, parse_status",
    body_weight: "id, synced, user_id, measured_at",
    daily_metrics: "id, synced, user_id, metric_date, [user_id+metric_date]",
    test_records: "id, synced, user_id, created_at",
  });
}
