import { parseLoad } from "./parseLoad";
import type { LocalBodyWeight } from "@/types/entities";

const MIN_PLAUSIBLE_KG = 20;
const MAX_PLAUSIBLE_KG = 400;

/**
 * Body weight input reuses parseLoad's number parsing (comma or dot decimal,
 * optional "kg" suffix — "82,5" -> 82.5) rather than duplicating the regex,
 * then rejects anything outside a plausible human weight range so a typo
 * like "825" doesn't silently save as 825 kg.
 */
export function parseBodyWeightKg(raw: string): number | null {
  const value = parseLoad(raw);
  if (value === null) return null;
  if (value < MIN_PLAUSIBLE_KG || value > MAX_PLAUSIBLE_KG) return null;
  return value;
}

export interface BodyWeightWithDelta {
  entry: LocalBodyWeight;
  /** kg vs. the next-older entry in the input order; null for the oldest (or only) entry. */
  delta_kg: number | null;
}

/**
 * Pairs each entry with the delta against the previous (older) measurement.
 * Expects `rows` already sorted descending by measured_at (newest first) —
 * the display order — so "previous" for row i is row i+1.
 */
export function weightDeltas(rows: LocalBodyWeight[]): BodyWeightWithDelta[] {
  return rows.map((entry, i) => {
    const previous = rows[i + 1];
    return {
      entry,
      delta_kg: previous ? Math.round((entry.weight_kg - previous.weight_kg) * 100) / 100 : null,
    };
  });
}
