export interface ParsedSet {
  load_raw: string;
  reps: number;
  rir: number | null;
}

export interface ParsedSets {
  exercise_query: string;
  sets: ParsedSet[];
}

export interface ParsedMealItem {
  name: string;
  quantity_raw: string | null;
}

export interface ParsedMeal {
  items: ParsedMealItem[];
  structured_text: string;
}

/**
 * Cheap models sometimes wrap JSON in ```json fences despite the system
 * prompt telling them not to. Strips a single leading/trailing fence pair;
 * text without fences passes through unchanged.
 */
export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSets(value: unknown): ParsedSets | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.exercise_query)) return null;
  if (!Array.isArray(value.sets) || value.sets.length === 0) return null;

  const sets: ParsedSet[] = [];
  for (const item of value.sets) {
    if (!isRecord(item)) return null;
    if (!isNonEmptyString(item.load_raw)) return null;
    if (!isPositiveInteger(item.reps)) return null;
    if (!isNullableNumber(item.rir)) return null;
    sets.push({ load_raw: item.load_raw, reps: item.reps, rir: item.rir });
  }

  return { exercise_query: value.exercise_query, sets };
}

function validateMeal(value: unknown): ParsedMeal | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.structured_text)) return null;
  if (!Array.isArray(value.items) || value.items.length === 0) return null;

  const items: ParsedMealItem[] = [];
  for (const item of value.items) {
    if (!isRecord(item)) return null;
    if (!isNonEmptyString(item.name)) return null;
    if (item.quantity_raw !== null && typeof item.quantity_raw !== "string") return null;
    items.push({ name: item.name, quantity_raw: item.quantity_raw });
  }

  return { items, structured_text: value.structured_text };
}

/**
 * Structural validation of the LLM's parsed JSON — no zod, not worth adding
 * a dependency for two shapes. Returns null on any deviation; the /api/parse
 * handler turns null into a 422 rather than trusting a malformed response.
 */
export function validateParseResult(kind: "sets", value: unknown): ParsedSets | null;
export function validateParseResult(kind: "meal", value: unknown): ParsedMeal | null;
export function validateParseResult(
  kind: "sets" | "meal",
  value: unknown
): ParsedSets | ParsedMeal | null {
  return kind === "sets" ? validateSets(value) : validateMeal(value);
}
