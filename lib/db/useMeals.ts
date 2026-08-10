import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { localDayRangeIso } from "@/lib/utils/dates";
import type { LocalMeal } from "@/types/entities";

/** Meals for a given local day, chronological ascending, excluding soft-deleted. */
export function useMealsForDay(date: string): LocalMeal[] | undefined {
  return useLiveQuery(async () => {
    const userId = await getLocalUserId();
    if (!userId) return [];

    const { startIso, endIso } = localDayRangeIso(date);
    const meals = await db.meals.where("occurred_at").between(startIso, endIso, true, false).toArray();

    return meals
      .filter((m) => m.user_id === userId && m.deleted_at === null)
      .sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));
  }, [date]);
}

/** Every meal (any day) still awaiting the LLM enrichment pass, for the count badge and "procesar pendientes". */
export function usePendingParseMeals(): LocalMeal[] | undefined {
  return useLiveQuery(async () => {
    const userId = await getLocalUserId();
    if (!userId) return [];

    const meals = await db.meals.where("parse_status").equals("pending_parse").toArray();
    return meals
      .filter((m) => m.user_id === userId && m.deleted_at === null)
      .sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));
  }, []);
}
