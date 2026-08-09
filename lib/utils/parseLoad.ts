const NUMERIC_LOAD = /^(\d+(?:[.,]\d+)?)\s*(?:kgs?)?$/i;

/**
 * Best-effort numeric parse of a verbatim load string, no LLM in this phase.
 * "190" -> 190 · "62,5" / "62.5" -> 62.5 · "40 kg" -> 40. Anything else
 * ("+10 kg de lastre", "40 kg/lado", "I10-D10") -> null: load_raw stays the
 * source of truth and load_normalized_kg is left absent rather than guessed.
 */
export function parseLoad(raw: string): number | null {
  const match = NUMERIC_LOAD.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
