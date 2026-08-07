/**
 * Single source of truth for entity shapes shared between Dexie (local) and
 * Supabase (remote). Every interface here mirrors a Postgres table 1:1
 * (see /supabase/migrations) and, wrapped in `LocalRecord<T>`, a Dexie table
 * (see /lib/db/schema.ts).
 */

export type Synced = 0 | 1;

/** Fixed muscle_group vocabulary used by the exercise catalog (seed + custom). */
export const MUSCLE_GROUPS = [
  "pecho",
  "espalda",
  "hombros",
  "bíceps",
  "tríceps",
  "cuádriceps",
  "isquios",
  "glúteos",
  "gemelos",
  "core",
  "antebrazos",
  "otro",
] as const;

export interface BaseEntity {
  id: string;
  user_id: string;
  created_at: string;
}

/** Adds the Dexie-only sync bookkeeping field. Never present in Supabase rows. */
export type LocalRecord<T extends BaseEntity> = T & { synced: Synced };

export interface Exercise extends BaseEntity {
  name_es: string;
  name_en: string | null;
  muscle_group: string;
  equipment: string | null;
  image_url: string | null;
  is_custom: boolean;
  source: "seed" | "custom";
}

export interface Routine extends BaseEntity {
  name: string;
  is_active: boolean;
  /** Soft delete: the push-only sync engine has no delete channel, so
   * "deleting" is just another field update that flows through the same
   * upsert pipeline. Null means not deleted. */
  deleted_at: string | null;
}

export interface RoutineDay extends BaseEntity {
  routine_id: string;
  day_label: string;
  day_order: number;
  notes: string | null;
  deleted_at: string | null;
}

export interface RoutineDayExercise extends BaseEntity {
  routine_day_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  progression_notes: string | null;
  deleted_at: string | null;
}

export interface TrainingSession extends BaseEntity {
  routine_day_id: string | null;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
}

export interface LoggedSet extends BaseEntity {
  training_session_id: string;
  exercise_id: string;
  set_order: number;
  reps: number;
  rir: number | null;
  /** Always populated, verbatim as entered ("+10 kg", "40 kg/lado", "I10-D10"). */
  load_raw: string;
  /** Best-effort numeric parse of load_raw; null when it can't be normalized. */
  load_normalized_kg: number | null;
}

export interface CardioSession extends BaseEntity {
  training_session_id: string | null;
  session_date: string;
  activity_type: "swim" | "other";
  duration_minutes: number;
  distance_meters: number | null;
  intensity_raw: string | null;
  intensity_rpe: number | null;
  notes: string | null;
}

export interface Meal extends BaseEntity {
  occurred_at: string;
  raw_text: string;
  structured_text: string | null;
  portion_raw: string | null;
  portion_grams: number | null;
  training_day_flag: boolean;
  parse_status: "unparsed" | "pending_parse" | "parsed";
}

export interface BodyWeight extends BaseEntity {
  measured_at: string;
  weight_kg: number;
  notes: string | null;
}

export interface DailyMetrics extends BaseEntity {
  metric_date: string;
  sleep_hours: number | null;
  feeling_1_10: number | null;
  steps: number | null;
}

export type LocalExercise = LocalRecord<Exercise>;
export type LocalRoutine = LocalRecord<Routine>;
export type LocalRoutineDay = LocalRecord<RoutineDay>;
export type LocalRoutineDayExercise = LocalRecord<RoutineDayExercise>;
export type LocalTrainingSession = LocalRecord<TrainingSession>;
export type LocalLoggedSet = LocalRecord<LoggedSet>;
export type LocalCardioSession = LocalRecord<CardioSession>;
export type LocalMeal = LocalRecord<Meal>;
export type LocalBodyWeight = LocalRecord<BodyWeight>;
export type LocalDailyMetrics = LocalRecord<DailyMetrics>;
