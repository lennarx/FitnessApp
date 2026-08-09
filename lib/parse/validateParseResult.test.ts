import { describe, expect, it } from "vitest";
import { stripJsonFences, validateParseResult } from "./validateParseResult";

describe("stripJsonFences", () => {
  it.each([
    ['```json\n{"a":1}\n```', '{"a":1}'],
    ['```\n{"a":1}\n```', '{"a":1}'],
    ['{"a":1}', '{"a":1}'],
    ['  ```json\n{"a":1}\n```  ', '{"a":1}'],
  ])("strips fences from %s", (raw, expected) => {
    expect(stripJsonFences(raw)).toBe(expected);
  });
});

describe("validateParseResult sets", () => {
  it.each([
    [{ exercise_query: "prensa", sets: [{ load_raw: "190", reps: 12, rir: 1 }] }],
    [
      {
        exercise_query: "press inclinado mancuernas",
        sets: [
          { load_raw: "32", reps: 10, rir: 2 },
          { load_raw: "30", reps: 9, rir: 2 },
          { load_raw: "28", reps: 8, rir: 2 },
        ],
      },
    ],
    [{ exercise_query: "dominadas", sets: [{ load_raw: "+10kg de lastre", reps: 8, rir: null }] }],
  ])("accepts valid sets payload %#", (payload) => {
    expect(validateParseResult("sets", payload)).not.toBeNull();
  });

  it.each([
    [null],
    [[]],
    ["prensa 190"],
    [{ exercise_query: "", sets: [{ load_raw: "190", reps: 12, rir: null }] }],
    [{ sets: [{ load_raw: "190", reps: 12, rir: null }] }],
    [{ exercise_query: "prensa", sets: [] }],
    [{ exercise_query: "prensa", sets: [{ load_raw: "190", reps: 0, rir: null }] }],
    [{ exercise_query: "prensa", sets: [{ load_raw: "190", reps: "12", rir: null }] }],
    [{ exercise_query: "prensa", sets: [{ load_raw: 190, reps: 12, rir: null }] }],
    [{ exercise_query: "prensa", sets: [{ load_raw: "190", reps: 12, rir: undefined }] }],
    [{ exercise_query: "prensa", sets: [{ load_raw: "", reps: 12, rir: null }] }],
  ])("rejects invalid sets payload %#", (payload) => {
    expect(validateParseResult("sets", payload)).toBeNull();
  });
});

describe("validateParseResult meal", () => {
  it("accepts a valid meal payload", () => {
    expect(
      validateParseResult("meal", {
        items: [
          { name: "cuadril", quantity_raw: "150g" },
          { name: "puré", quantity_raw: null },
        ],
        structured_text: "150g de cuadril con puré",
      })
    ).not.toBeNull();
  });

  it.each([
    [null],
    [[]],
    [{ items: [], structured_text: "algo" }],
    [{ items: [{ name: "", quantity_raw: null }], structured_text: "algo" }],
    [{ items: [{ quantity_raw: null }], structured_text: "algo" }],
    [{ items: [{ name: "mate cocido", quantity_raw: 1 }], structured_text: "algo" }],
    [{ items: [{ name: "mate cocido", quantity_raw: null }], structured_text: "" }],
    [{ items: [{ name: "mate cocido", quantity_raw: null }] }],
  ])("rejects invalid meal payload %#", (payload) => {
    expect(validateParseResult("meal", payload)).toBeNull();
  });
});
