import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { LocalExercise } from "@/types/entities";

/** Local/offline search+filter over the exercise catalog, reactive via liveQuery. */
export function useExercises(search: string, muscleGroup: string): LocalExercise[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.exercises.toArray();
    const term = search.trim().toLowerCase();

    return all
      .filter((e) => !muscleGroup || e.muscle_group === muscleGroup)
      .filter(
        (e) =>
          !term ||
          e.name_es.toLowerCase().includes(term) ||
          (e.name_en?.toLowerCase().includes(term) ?? false)
      )
      .sort((a, b) => a.name_es.localeCompare(b.name_es));
  }, [search, muscleGroup]);
}
