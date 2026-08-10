import { describe, expect, it } from "vitest";
import { derivePortion } from "./mealPortion";

describe("derivePortion", () => {
  it("returns null/null when no item has a quantity", () => {
    expect(derivePortion([{ name: "pan integral", quantity_raw: null }])).toEqual({
      portion_raw: null,
      portion_grams: null,
    });
  });

  it("returns null/null when several items have a quantity", () => {
    expect(
      derivePortion([
        { name: "huevos revueltos", quantity_raw: "3" },
        { name: "mate cocido", quantity_raw: "1" },
      ])
    ).toEqual({ portion_raw: null, portion_grams: null });
  });

  it.each([
    ["150g", "150g", 150],
    ["150gr", "150gr", 150],
    ["150 gramos", "150 gramos", 150],
    ["3", "3", null],
    ["un plato", "un plato", null],
    ["200ml", "200ml", null],
  ])("single quantified item %s -> portion_raw %s, portion_grams %s", (quantity, rawExpected, gramsExpected) => {
    expect(derivePortion([{ name: "cuadril", quantity_raw: quantity }])).toEqual({
      portion_raw: rawExpected,
      portion_grams: gramsExpected,
    });
  });
});
