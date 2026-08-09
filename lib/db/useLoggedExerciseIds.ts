import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

/** exercise_ids with at least one non-deleted logged set — scopes the /historial picker. */
export function useLoggedExerciseIds(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const sets = await db.logged_sets.filter((s) => s.deleted_at === null).toArray();
    return new Set(sets.map((s) => s.exercise_id));
  }, []);
}
