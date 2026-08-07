"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { SYNCED_TABLES } from "./registry";

/** Reactive count of unsynced rows across every synced table. No polling. */
export function useSyncStatus(): { pendingCount: number } {
  const pendingCount = useLiveQuery(
    async () => {
      const counts = await Promise.all(
        SYNCED_TABLES.map((table) =>
          db.table(table).where("synced").equals(0).count()
        )
      );
      return counts.reduce((sum, count) => sum + count, 0);
    },
    [],
    0
  );

  return { pendingCount: pendingCount ?? 0 };
}
