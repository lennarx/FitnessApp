"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { upsertDailyMetrics } from "@/lib/db/dailyMetrics";
import { addLocalDays, formatSessionDate, todayLocalDate } from "@/lib/utils/dates";

/**
 * Date navigation + the two day-level fields from the brief: the training
 * day toggle (owned by the parent — it needs the current value even before
 * any meal exists to stamp new ones) and steps, written straight through
 * the existing upsertDailyMetrics get-or-create helper.
 */
export function DayHeader({
  date,
  onDateChange,
  trainingDayFlag,
  onToggleTrainingDay,
}: {
  date: string;
  onDateChange: (date: string) => void;
  trainingDayFlag: boolean;
  onToggleTrainingDay: () => void;
}) {
  const dailyMetrics = useLiveQuery(async () => {
    const userId = await getLocalUserId();
    if (!userId) return null;
    return (
      (await db.daily_metrics.where("[user_id+metric_date]").equals([userId, date]).first()) ?? null
    );
  }, [date]);

  const [steps, setSteps] = useState("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Same render-time hydration pattern as DailyMetricsPanel: loads the
  // day's saved step count once per `date` without clobbering what the
  // user is mid-typing on every liveQuery re-fire.
  if (dailyMetrics !== undefined && hydratedFor !== date) {
    setSteps(dailyMetrics?.steps?.toString() ?? "");
    setHydratedFor(date);
  }

  async function handleStepsBlur() {
    if (steps.trim() === "") return;
    await upsertDailyMetrics(date, { steps: Number(steps) });
  }

  const isToday = date === todayLocalDate();

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onDateChange(addLocalDays(date, -1))}
          aria-label="Día anterior"
          className="rounded-md px-3 py-2 text-neutral-400"
        >
          ←
        </button>
        <div className="flex flex-col items-center">
          <span className="text-base font-medium capitalize">{formatSessionDate(date)}</span>
          {!isToday && (
            <button
              onClick={() => onDateChange(todayLocalDate())}
              className="text-xs text-emerald-400"
            >
              Hoy
            </button>
          )}
        </div>
        <button
          onClick={() => onDateChange(addLocalDays(date, 1))}
          aria-label="Día siguiente"
          className="rounded-md px-3 py-2 text-neutral-400"
        >
          →
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={trainingDayFlag}
            onChange={onToggleTrainingDay}
            className="h-5 w-5"
          />
          Día de entrenamiento
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          Pasos
          <input
            type="number"
            inputMode="numeric"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            onBlur={handleStepsBlur}
            className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-base text-neutral-100"
          />
        </label>
      </div>
    </div>
  );
}
