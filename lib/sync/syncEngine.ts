import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { SYNCED_TABLES, type SyncedTable } from "./registry";

let syncing = false;
let attempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const PUSH_CHUNK_SIZE = 500;

function computeBackoffMs(): number {
  return Math.min(2 ** attempts * 1000, 60000);
}

async function pushTable(table: SyncedTable): Promise<void> {
  const localTable = db.table(table);
  const pending = await localTable.where("synced").equals(0).toArray();
  if (pending.length === 0) return;

  const supabase = createClient();

  // Chunked so a large pending backlog (e.g. the ~800-row exercise seed)
  // never hits Supabase's per-request payload limits in one shot. Each
  // chunk is upserted (idempotent on id) and marked synced independently;
  // if a chunk fails, the throw stops the loop and leaves the remaining
  // chunks synced:0 for the next retry — same idempotent semantics as
  // before, just applied per chunk instead of per table.
  for (let i = 0; i < pending.length; i += PUSH_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + PUSH_CHUNK_SIZE);
    const payload = chunk.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      delete copy.synced;
      return copy;
    });

    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (error) throw error;

    const ids = chunk.map((row) => row.id);
    await localTable.where("id").anyOf(ids).modify({ synced: 1 });
  }
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
