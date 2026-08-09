import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { LocalLoggedSet, LocalTrainingSession } from "@/types/entities";

export interface HistorySessionEntry {
  session: LocalTrainingSession;
  sets: LocalLoggedSet[];
  maxLoad: number | null;
  /** vs. the immediately preceding session. Null when either side has no
   * numeric load_normalized_kg — never inferred from load_raw strings. */
  trend: "up" | "down" | "flat" | null;
}

/** Chronological history for one exercise, newest session first. */
export function useExerciseHistory(exerciseId: string): HistorySessionEntry[] | undefined {
  return useLiveQuery(async () => {
    const sets = await db.logged_sets
      .where("exercise_id")
      .equals(exerciseId)
      .filter((s) => s.deleted_at === null)
      .toArray();

    if (sets.length === 0) return [];

    const setsBySession = new Map<string, LocalLoggedSet[]>();
    for (const set of sets) {
      const list = setsBySession.get(set.training_session_id) ?? [];
      list.push(set);
      setsBySession.set(set.training_session_id, list);
    }

    const sessions = await Promise.all(
      [...setsBySession.keys()].map((id) => db.training_sessions.get(id))
    );
    const validSessions = sessions.filter((s): s is LocalTrainingSession => s !== undefined);

    validSessions.sort((a, b) =>
      `${a.session_date}T${a.created_at}`.localeCompare(`${b.session_date}T${b.created_at}`)
    );

    const withMaxLoad = validSessions.map((session) => {
      const sessionSets = (setsBySession.get(session.id) ?? []).sort(
        (a, b) => a.set_order - b.set_order
      );
      const numericLoads = sessionSets
        .map((s) => s.load_normalized_kg)
        .filter((v): v is number => v !== null);
      const maxLoad = numericLoads.length > 0 ? Math.max(...numericLoads) : null;
      return { session, sets: sessionSets, maxLoad };
    });

    const entries: HistorySessionEntry[] = withMaxLoad.map((entry, index) => {
      const previousMaxLoad = index > 0 ? withMaxLoad[index - 1].maxLoad : null;
      let trend: HistorySessionEntry["trend"] = null;
      if (entry.maxLoad !== null && previousMaxLoad !== null) {
        trend =
          entry.maxLoad > previousMaxLoad
            ? "up"
            : entry.maxLoad < previousMaxLoad
              ? "down"
              : "flat";
      }
      return { ...entry, trend };
    });

    return entries.reverse();
  }, [exerciseId]);
}
