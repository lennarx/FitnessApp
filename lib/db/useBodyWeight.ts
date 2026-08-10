import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { weightDeltas, type BodyWeightWithDelta } from "@/lib/utils/parseWeight";

/** Body weight log, newest first, excluding soft-deleted, paired with the delta vs. the previous entry. */
export function useBodyWeightLog(): BodyWeightWithDelta[] | undefined {
  return useLiveQuery(async () => {
    const userId = await getLocalUserId();
    if (!userId) return [];

    const rows = await db.body_weight.where("user_id").equals(userId).toArray();
    const sorted = rows
      .filter((r) => r.deleted_at === null)
      .sort((a, b) => (a.measured_at < b.measured_at ? 1 : -1));

    return weightDeltas(sorted);
  }, []);
}
