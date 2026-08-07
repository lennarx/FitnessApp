"use client";

import { useSyncStatus } from "@/lib/sync/useSyncStatus";

export function SyncStatusBadge() {
  const { pendingCount } = useSyncStatus();
  const isUpToDate = pendingCount === 0;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
        isUpToDate
          ? "bg-emerald-900 text-emerald-300"
          : "bg-amber-900 text-amber-300"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isUpToDate ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      {isUpToDate ? "Al día" : `${pendingCount} pendientes de sincronizar`}
    </span>
  );
}
