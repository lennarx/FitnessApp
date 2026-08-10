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
 * Flat, unfiltered read of every table the export needs. All soft-delete filtering
 * happens in buildWorkbookData, which is the part that's actually tested — this
 * stays a thin, untested I/O layer on purpose.
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
    db.routines.toArray(),
    db.routine_days.toArray(),
    db.routine_day_exercises.toArray(),
    db.exercises.toArray(),
    db.training_sessions.toArray(),
    db.logged_sets.toArray(),
    db.cardio_sessions.toArray(),
    db.meals.toArray(),
    db.body_weight.toArray(),
    db.daily_metrics.toArray(),
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
