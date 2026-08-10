import type { ParsedMeal } from "./validateParseResult";

export type MealParseResult =
  | { ok: true; parsed: ParsedMeal }
  | { ok: false; reason: "offline" | "network" | "upstream" | "malformed" | "auth" };

/**
 * Shared client for POST /api/parse with kind: "meal" — used by both the
 * composer's immediate enrichment attempt and "procesar pendientes", so the
 * status-code handling that already lives inline in NlQuickLog for sets
 * isn't duplicated a second time for meals. Unlike NlQuickLog, callers never
 * need to fall back to nl_inbox on failure — the meal row already exists in
 * `meals` with `parse_status: "pending_parse"`; a failed parse just leaves
 * it that way for the next retry.
 */
export async function requestMealParse(text: string): Promise<MealParseResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: false, reason: "offline" };
  }

  let res: Response;
  try {
    res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "meal", text }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (res.status === 401) return { ok: false, reason: "auth" };
  if (res.status === 422) return { ok: false, reason: "malformed" };
  if (!res.ok) return { ok: false, reason: "upstream" };

  try {
    const parsed = (await res.json()) as ParsedMeal;
    return { ok: true, parsed };
  } catch {
    // A 2xx response with an empty/non-JSON body (proxy or CDN edge case) —
    // treat it the same as a structurally invalid parse result.
    return { ok: false, reason: "malformed" };
  }
}
