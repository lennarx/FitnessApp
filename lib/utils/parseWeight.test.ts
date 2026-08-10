import { describe, expect, it } from "vitest";
import { parseBodyWeightKg, weightDeltas } from "./parseWeight";
import type { LocalBodyWeight } from "@/types/entities";

describe("parseBodyWeightKg", () => {
  it.each([
    ["82,5", 82.5],
    ["82.5", 82.5],
    ["90", 90],
    ["90kg", 90],
  ])("parses %s as %d", (raw, expected) => {
    expect(parseBodyWeightKg(raw)).toBe(expected);
  });

  it.each([["10"], ["500"], [""], ["abc"]])("returns null for implausible/invalid %s", (raw) => {
    expect(parseBodyWeightKg(raw)).toBeNull();
  });
});

function makeEntry(id: string, weight_kg: number, measured_at: string): LocalBodyWeight {
  return {
    id,
    user_id: "u1",
    created_at: measured_at,
    measured_at,
    weight_kg,
    notes: null,
    deleted_at: null,
    synced: 1,
  };
}

describe("weightDeltas", () => {
  it("returns null delta for a single entry", () => {
    const rows = [makeEntry("1", 82, "2026-08-09")];
    expect(weightDeltas(rows)).toEqual([{ entry: rows[0], delta_kg: null }]);
  });

  it("computes delta against the next-older entry, newest first", () => {
    const rows = [
      makeEntry("1", 82.5, "2026-08-09"),
      makeEntry("2", 82, "2026-08-06"),
      makeEntry("3", 83, "2026-08-03"),
    ];
    expect(weightDeltas(rows)).toEqual([
      { entry: rows[0], delta_kg: 0.5 },
      { entry: rows[1], delta_kg: -1 },
      { entry: rows[2], delta_kg: null },
    ]);
  });
});
