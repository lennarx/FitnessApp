import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { SYNCED_TABLES, type SyncedTable } from "./registry";

let syncing = false;
let attempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function computeBackoffMs(): number {
  return Math.min(2 ** attempts * 1000, 60000);
}

async function pushTable(table: SyncedTable): Promise<void> {
  const localTable = db.table(table);
  const pending = await localTable.where("synced").equals(0).toArray();
  if (pending.length === 0) return;

  // Idempotent upsert on id: id is the same value as the Dexie local_id, so
  // a retried push after a partial failure is a safe no-op, never a duplicate.
  const payload = pending.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    delete copy.synced;
    return copy;
  });

  const supabase = createClient();
  const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw error;

  const ids = pending.map((row) => row.id);
  await localTable.where("id").anyOf(ids).modify({ synced: 1 });
}

/** Pushes every pending (synced: 0) row across all tables. Idempotent, mutexed. */
export async function pushPending(): Promise<void> {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncing = true;
  try {
    for (const table of SYNCED_TABLES) {
      await pushTable(table);
    }
    attempts = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  } catch {
    attempts += 1;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      void pushPending();
    }, computeBackoffMs());
  } finally {
    syncing = false;
  }
}

/** Signals a local write happened — useSyncTrigger listens and pushes. No-op offline. */
export function requestSync(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sync:requested"));
  }
}
