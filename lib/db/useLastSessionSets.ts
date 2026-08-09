import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { LocalLoggedSet, LocalTrainingSession } from "@/types/entities";

/**
 * Sets from the most recent OTHER session where this exercise was logged —
 * used to prefill the draft row per set number. Excludes the current
 * session so reopening the exercise card mid-session doesn't "autocomplete"
 * from its own just-logged sets.
 */
export function useLastSessionSets(
  exerciseId: string,
  currentSessionId: string
): LocalLoggedSet[] | undefined {
  return useLiveQuery(async () => {
    const sets = await db.logged_sets
      .where("exercise_id")
      .equals(exerciseId)
      .filter((s) => s.deleted_at === null && s.training_session_id !== currentSessionId)
      .toArray();

    if (sets.length === 0) return [];

    const sessionIds = [...new Set(sets.map((s) => s.training_session_id))];
    const sessions = await Promise.all(sessionIds.map((id) => db.training_sessions.get(id)));
    const sessionById = new Map(
      sessions
        .filter((s): s is LocalTrainingSession => s !== undefined)
        .map((s) => [s.id, s])
    );

    let latestSessionId: string | null = null;
    let latestKey = "";
    for (const id of sessionIds) {
      const session = sessionById.get(id);
      if (!session) continue;
      const key = `${session.session_date}T${session.created_at}`;
      if (key > latestKey) {
        latestKey = key;
        latestSessionId = id;
      }
    }

    if (!latestSessionId) return [];

    return sets
      .filter((s) => s.training_session_id === latestSessionId)
      .sort((a, b) => a.set_order - b.set_order);
  }, [exerciseId, currentSessionId]);
}
