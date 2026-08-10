import type { ParsedMealItem } from "./validateParseResult";

const GRAMS = /^(\d+(?:[.,]\d+)?)\s*g(?:r|rs|ramos?)?$/i;

/**
 * Best-effort numeric parse of a portion string in grams. "150g" -> 150,
 * "150gr" / "150 gramos" -> 150. Anything else ("3", "un plato", "200ml")
 * -> null: portion_raw stays the source of truth.
 */
function parseGrams(raw: string): number | null {
  const match = GRAMS.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/**
 * A meal parse can name a quantity per item ("150g de cuadril", "un plato de
 * puré"), but meals.portion_raw/portion_grams are single columns, not one
 * per item. Only populate them when the LLM's result is unambiguous — a
 * single item carrying a quantity; with zero or several quantified items
 * there's no one portion to promote, and structured_text already carries
 * the full breakdown, so guessing here would be worse than leaving null.
 */
export function derivePortion(items: ParsedMealItem[]): {
  portion_raw: string | null;
  portion_grams: number | null;
} {
  const withQuantity = items.filter((item) => item.quantity_raw !== null);
  if (withQuantity.length !== 1) {
    return { portion_raw: null, portion_grams: null };
  }

  const portion_raw = withQuantity[0].quantity_raw;
  return { portion_raw, portion_grams: portion_raw ? parseGrams(portion_raw) : null };
}
