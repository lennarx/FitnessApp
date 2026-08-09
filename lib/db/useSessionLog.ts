import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { LocalExercise, LocalLoggedSet, LocalRoutineDayExercise } from "@/types/entities";

export interface SessionExerciseEntry {
  exercise: LocalExercise;
  /** Null for exercises added to this session ad-hoc (not part of the routine day). */
  dayExercise: LocalRoutineDayExercise | null;
  sets: LocalLoggedSet[];
}

/**
 * Assembles the exercise list for a session: the routine day's exercises
 * (in order) joined with exercises and this session's sets, plus any extra
 * exercise the user logged a set for without it being on the day. An extra
 * exercise the user just added from the picker but hasn't logged a set for
 * yet has no row anywhere (there's no "session_exercises" table in this
 * schema) — the page keeps that one in local state until the first set
 * persists it here.
 */
export function useSessionLog(sessionId: string): SessionExerciseEntry[] | undefined {
  return useLiveQuery(async () => {
    const session = await db.training_sessions.get(sessionId);
    if (!session) return [];

    const sets = await db.logged_sets
      .where("training_session_id")
      .equals(sessionId)
      .filter((s) => s.deleted_at === null)
      .toArray();

    const setsByExercise = new Map<string, LocalLoggedSet[]>();
    for (const set of sets) {
      const list = setsByExercise.get(set.exercise_id) ?? [];
      list.push(set);
      setsByExercise.set(set.exercise_id, list);
    }
    for (const list of setsByExercise.values()) {
      list.sort((a, b) => a.set_order - b.set_order);
    }

    const dayExercises = session.routine_day_id
      ? (
          await db.routine_day_exercises
            .where("routine_day_id")
            .equals(session.routine_day_id)
            .toArray()
        )
          .filter((e) => e.deleted_at === null)
          .sort((a, b) => a.exercise_order - b.exercise_order)
      : [];

    const dayExerciseIds = new Set(dayExercises.map((e) => e.exercise_id));
    const extraExerciseIds = [...setsByExercise.keys()].filter((id) => !dayExerciseIds.has(id));

    const allExerciseIds = [...dayExercises.map((e) => e.exercise_id), ...extraExerciseIds];
    const exercises = await Promise.all(allExerciseIds.map((id) => db.exercises.get(id)));
    const exerciseById = new Map(
      exercises.filter((e): e is LocalExercise => e !== undefined).map((e) => [e.id, e])
    );

    const dayEntries = dayExercises
      .map((dayExercise): SessionExerciseEntry | null => {
        const exercise = exerciseById.get(dayExercise.exercise_id);
        if (!exercise) return null;
        return {
          exercise,
          dayExercise,
          sets: setsByExercise.get(dayExercise.exercise_id) ?? [],
        };
      })
      .filter((e): e is SessionExerciseEntry => e !== null);

    const extraEntries = extraExerciseIds
      .map((exerciseId): SessionExerciseEntry | null => {
        const exercise = exerciseById.get(exerciseId);
        if (!exercise) return null;
        return { exercise, dayExercise: null, sets: setsByExercise.get(exerciseId) ?? [] };
      })
      .filter((e): e is SessionExerciseEntry => e !== null);

    return [...dayEntries, ...extraEntries];
  }, [sessionId]);
}
