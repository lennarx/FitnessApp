import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";
import { newId } from "@/lib/utils/ids";

/**
 * Get-or-create by (user_id, metric_date). daily_metrics has a unique
 * (user_id, metric_date) constraint in Postgres, so two independent inserts
 * for the same day (e.g. saving sleep, then feeling, in quick succession)
 * would sync fine individually but the second upsert would violate the
 * remote constraint's twin — reusing the same row's id on the second write
 * is what keeps this a single row. The read-then-write happens inside one
 * Dexie transaction so two calls firing close together can't both read
 * "doesn't exist" and both insert.
 */
export async function upsertDailyMetrics(
  metricDate: string,
  patch: Partial<{
    sleep_hours: number | null;
    feeling_1_10: number | null;
    steps: number | null;
  }>
): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  return db.transaction("rw", db.daily_metrics, async () => {
    const existing = await db.daily_metrics
      .where("[user_id+metric_date]")
      .equals([userId, metricDate])
      .first();

    if (existing) {
      await db.daily_metrics.update(existing.id, { ...patch, synced: 0 });
      return existing.id;
    }

    const id = newId();
    await db.daily_metrics.add({
      id,
      user_id: userId,
      created_at: new Date().toISOString(),
      metric_date: metricDate,
      sleep_hours: patch.sleep_hours ?? null,
      feeling_1_10: patch.feeling_1_10 ?? null,
      steps: patch.steps ?? null,
      synced: 0,
    });
    return id;
  }).then((id) => {
    requestSync();
    return id;
  });
}
