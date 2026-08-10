import Dexie, { type Table } from "dexie";
import type {
  LocalBodyWeight,
  LocalCardioSession,
  LocalDailyMetrics,
  LocalExercise,
  LocalLoggedSet,
  LocalMeal,
  LocalNlInbox,
  LocalRoutine,
  LocalRoutineDay,
  LocalRoutineDayExercise,
  LocalTrainingSession,
} from "@/types/entities";
import { applySchema } from "./schema";

class FitnessDB extends Dexie {
  exercises!: Table<LocalExercise, string>;
  routines!: Table<LocalRoutine, string>;
  routine_days!: Table<LocalRoutineDay, string>;
  routine_day_exercises!: Table<LocalRoutineDayExercise, string>;
  training_sessions!: Table<LocalTrainingSession, string>;
  logged_sets!: Table<LocalLoggedSet, string>;
  cardio_sessions!: Table<LocalCardioSession, string>;
  meals!: Table<LocalMeal, string>;
  body_weight!: Table<LocalBodyWeight, string>;
  daily_metrics!: Table<LocalDailyMetrics, string>;
  nl_inbox!: Table<LocalNlInbox, string>;

  constructor() {
    super("fitness-app");
    applySchema(this);
  }
}

export const db = new FitnessDB();
