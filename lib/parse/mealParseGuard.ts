import type { LocalMeal } from "@/types/entities";

/**
 * A meal parse takes ~1-15s in flight. During that window the user can edit
 * the raw text (raw_text changes and parse_status resets to pending_parse
 * with the new text), delete the meal (deleted_at set), or hit "No procesar"
 * (parse_status -> unparsed, terminal). Without this check, the late
 * response overwrites whichever of those happened with a result derived
 * from stale text. expectedRawText is the (trimmed) text that was actually
 * sent to the parse endpoint — if the row's current raw_text doesn't match
 * it, a newer parse for the current text is already in flight or pending.
 */
export function shouldApplyMealParse(
  meal: LocalMeal | undefined,
  expectedRawText: string
): boolean {
  if (!meal) return false;
  if (meal.deleted_at !== null) return false;
  if (meal.parse_status !== "pending_parse") return false;
  return meal.raw_text === expectedRawText;
}
