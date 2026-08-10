import { getLocalUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type {
  LocalBodyWeight,
  LocalCardioSession,
  LocalDailyMetrics,
  LocalExercise,
  LocalLoggedSet,
  LocalMeal,
  LocalRoutine,
  LocalRoutineDay,
  LocalRoutineDayExercise,
  LocalTrainingSession,
} from "@/types/entities";

/**
 * Reads every table the export needs, scoped to the current user. All
 * soft-delete filtering happens in buildWorkbookData, which is the part
 * that's actually tested — this stays a thin, untested I/O layer on purpose.
 */
export interface ExportSnapshot {
  routines: LocalRoutine[];
  routine_days: LocalRoutineDay[];
  routine_day_exercises: LocalRoutineDayExercise[];
  exercises: LocalExercise[];
  training_sessions: LocalTrainingSession[];
  logged_sets: LocalLoggedSet[];
  cardio_sessions: LocalCardioSession[];
  meals: LocalMeal[];
  body_weight: LocalBodyWeight[];
  daily_metrics: LocalDailyMetrics[];
}

export async function readExportSnapshot(): Promise<ExportSnapshot> {
  const userId = await getLocalUserId();

  if (!userId) {
    return {
      routines: [],
      routine_days: [],
      routine_day_exercises: [],
      exercises: [],
      training_sessions: [],
      logged_sets: [],
      cardio_sessions: [],
      meals: [],
      body_weight: [],
      daily_metrics: [],
    };
  }

  const [
    routines,
    routine_days,
    routine_day_exercises,
    exercises,
    training_sessions,
    logged_sets,
    cardio_sessions,
    meals,
    body_weight,
    daily_metrics,
  ] = await Promise.all([
    db.routines.where("user_id").equals(userId).toArray(),
    db.routine_days.where("user_id").equals(userId).toArray(),
    db.routine_day_exercises.where("user_id").equals(userId).toArray(),
    db.exercises.where("user_id").equals(userId).toArray(),
    db.training_sessions.where("user_id").equals(userId).toArray(),
    db.logged_sets.where("user_id").equals(userId).toArray(),
    db.cardio_sessions.where("user_id").equals(userId).toArray(),
    db.meals.where("user_id").equals(userId).toArray(),
    db.body_weight.where("user_id").equals(userId).toArray(),
    db.daily_metrics.where("user_id").equals(userId).toArray(),
  ]);

  return {
    routines,
    routine_days,
    routine_day_exercises,
    exercises,
    training_sessions,
    logged_sets,
    cardio_sessions,
    meals,
    body_weight,
    daily_metrics,
  };
}
