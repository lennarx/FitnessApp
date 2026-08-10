import { describe, expect, it } from "vitest";
import { shouldApplyMealParse } from "./mealParseGuard";
import type { LocalMeal } from "@/types/entities";

function makeMeal(overrides: Partial<LocalMeal> = {}): LocalMeal {
  return {
    id: "m1",
    user_id: "u1",
    created_at: "2026-08-01T00:00:00.000Z",
    occurred_at: "2026-08-01T12:00:00.000Z",
    raw_text: "2 huevos",
    structured_text: null,
    portion_raw: null,
    portion_grams: null,
    training_day_flag: false,
    parse_status: "pending_parse",
    deleted_at: null,
    synced: 1,
    ...overrides,
  };
}

describe("shouldApplyMealParse", () => {
  it("returns false when the row no longer exists", () => {
    expect(shouldApplyMealParse(undefined, "2 huevos")).toBe(false);
  });

  it("returns false when the row was soft-deleted while parsing", () => {
    const meal = makeMeal({ deleted_at: "2026-08-01T12:05:00.000Z" });
    expect(shouldApplyMealParse(meal, "2 huevos")).toBe(false);
  });

  it("returns false when the user marked it 'no procesar' (unparsed) while parsing", () => {
    const meal = makeMeal({ parse_status: "unparsed" });
    expect(shouldApplyMealParse(meal, "2 huevos")).toBe(false);
  });

  it("returns false when the row was already parsed (a newer response landed first)", () => {
    const meal = makeMeal({ parse_status: "parsed", structured_text: "2 huevos (140 kcal)" });
    expect(shouldApplyMealParse(meal, "2 huevos")).toBe(false);
  });

  it("returns false when raw_text changed since the parse was requested", () => {
    const meal = makeMeal({ raw_text: "3 huevos" });
    expect(shouldApplyMealParse(meal, "2 huevos")).toBe(false);
  });

  it("returns true when the row is still pending_parse with the same text", () => {
    const meal = makeMeal();
    expect(shouldApplyMealParse(meal, "2 huevos")).toBe(true);
  });
});
