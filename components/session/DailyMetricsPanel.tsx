"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { upsertDailyMetrics } from "@/lib/db/dailyMetrics";

export function DailyMetricsPanel({ metricDate }: { metricDate: string }) {
  const existing = useLiveQuery(async () => {
    const userId = await getLocalUserId();
    if (!userId) return null;
    return (
      (await db.daily_metrics
        .where("[user_id+metric_date]")
        .equals([userId, metricDate])
        .first()) ?? null
    );
  }, [metricDate]);

  const [sleepHours, setSleepHours] = useState("");
  const [feeling, setFeeling] = useState("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Loads today's already-saved values once per metricDate, during render
  // rather than an effect (React's documented pattern for this), so it
  // doesn't clobber what the user is mid-typing on every liveQuery re-fire
  // (e.g. right after the onBlur write below triggers this same query again).
  if (existing !== undefined && hydratedFor !== metricDate) {
    setSleepHours(existing?.sleep_hours?.toString() ?? "");
    setFeeling(existing?.feeling_1_10?.toString() ?? "");
    setHydratedFor(metricDate);
  }

  async function handleSleepBlur() {
    if (sleepHours.trim() === "") return;
    await upsertDailyMetrics(metricDate, { sleep_hours: Number(sleepHours) });
  }

  async function handleFeelingBlur() {
    if (feeling.trim() === "") return;
    await upsertDailyMetrics(metricDate, { feeling_1_10: Number(feeling) });
  }

  return (
    <details className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <summary className="cursor-pointer text-sm text-neutral-400">Sueño y sensación</summary>
      <div className="mt-3 flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
          Horas de sueño
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            onBlur={handleSleepBlur}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
          Sensación (1-10)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            onBlur={handleFeelingBlur}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>
      </div>
    </details>
  );
}
