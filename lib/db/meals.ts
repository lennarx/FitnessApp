import { db } from "@/lib/db";
import { getLocalUserId } from "@/lib/auth/session";
import { derivePortion } from "@/lib/parse/mealPortion";
import type { ParsedMeal } from "@/lib/parse/validateParseResult";
import { requestSync } from "@/lib/sync/syncEngine";
import { localDayRangeIso } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";

/**
 * Unlike sets (which need nl_inbox because they need structure — exercise +
 * load + reps — before they can even exist as a row), a meal is always
 * saveable as-is: raw_text is the record. It's created immediately with
 * parse_status "pending_parse"; the LLM enrichment is a separate step that
 * may never happen without losing anything.
 */
export async function createMeal(input: {
  raw_text: string;
  occurred_at: string;
  training_day_flag: boolean;
}): Promise<string | null> {
  const userId = await getLocalUserId();
  if (!userId) return null;

  const id = newId();
  await db.meals.add({
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    occurred_at: input.occurred_at,
    raw_text: input.raw_text.trim(),
    structured_text: null,
    portion_raw: null,
    portion_grams: null,
    training_day_flag: input.training_day_flag,
    parse_status: "pending_parse",
    deleted_at: null,
    synced: 0,
  });

  requestSync();
  return id;
}

/** Enrichment step: fills structured_text + portion from a successful parse. */
export async function applyMealParse(id: string, parsed: ParsedMeal): Promise<void> {
  const { portion_raw, portion_grams } = derivePortion(parsed.items);
  await db.meals.update(id, {
    structured_text: parsed.structured_text,
    portion_raw,
    portion_grams,
    parse_status: "parsed",
    synced: 0,
  });
  requestSync();
}

/**
 * Editing raw_text invalidates whatever was derived from the old text, so
 * this resets to pending_parse in the same update — same criterion as
 * updateLoggedSet recomputing load_normalized_kg: derived fields never sit
 * stale next to a changed source.
 */
export async function updateMealRawText(id: string, raw_text: string): Promise<void> {
  await db.meals.update(id, {
    raw_text: raw_text.trim(),
    structured_text: null,
    portion_raw: null,
    portion_grams: null,
    parse_status: "pending_parse",
    synced: 0,
  });
  requestSync();
}

export async function updateMealOccurredAt(id: string, occurred_at: string): Promise<void> {
  await db.meals.update(id, { occurred_at, synced: 0 });
  requestSync();
}

/** Terminal "no procesar" state — skips the text on future "procesar pendientes" passes. */
export async function skipMealParse(id: string): Promise<void> {
  await db.meals.update(id, { parse_status: "unparsed", synced: 0 });
  requestSync();
}

export async function deleteMeal(id: string): Promise<void> {
  await db.meals.update(id, { deleted_at: new Date().toISOString(), synced: 0 });
  requestSync();
}

/**
 * training_day_flag lives per-meal in the schema but is edited as a
 * day-level toggle: this writes it to every non-deleted meal already logged
 * that day. New meals created afterward pick up the day's current value
 * from the caller (see MealComposer) rather than re-reading this table.
 */
export async function setDayTrainingFlag(date: string, flag: boolean): Promise<void> {
  const userId = await getLocalUserId();
  if (!userId) return;

  const { startIso, endIso } = localDayRangeIso(date);

  await db.transaction("rw", db.meals, async () => {
    await db.meals
      .where("occurred_at")
      .between(startIso, endIso, true, false)
      .filter((m) => m.user_id === userId && m.deleted_at === null)
      .modify({ training_day_flag: flag, synced: 0 });
  });

  requestSync();
}
