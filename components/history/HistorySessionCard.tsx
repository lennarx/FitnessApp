"use client";

import type { HistorySessionEntry } from "@/lib/db/useExerciseHistory";
import { formatSessionDate } from "@/lib/utils/dates";

const TREND_ICON: Record<NonNullable<HistorySessionEntry["trend"]>, string> = {
  up: "▲",
  down: "▼",
  flat: "=",
};

const TREND_COLOR: Record<NonNullable<HistorySessionEntry["trend"]>, string> = {
  up: "text-emerald-400",
  down: "text-red-400",
  flat: "text-neutral-400",
};

export function HistorySessionCard({ entry }: { entry: HistorySessionEntry }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-base">{formatSessionDate(entry.session.session_date)}</span>
        {entry.trend && (
          <span className={`text-sm ${TREND_COLOR[entry.trend]}`}>{TREND_ICON[entry.trend]}</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {entry.sets.map((set) => (
          <span key={set.id} className="text-sm text-neutral-400">
            {set.load_raw} × {set.reps}
            {set.rir !== null ? ` @ RIR ${set.rir}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
