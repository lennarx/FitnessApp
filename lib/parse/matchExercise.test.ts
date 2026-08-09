import { describe, expect, it } from "vitest";
import { normalizeText, resolveExerciseMatch, type ExerciseCandidate } from "./matchExercise";

const catalog: ExerciseCandidate[] = [
  { id: "1", name_es: "Prensa 45°", name_en: "Leg press" },
  { id: "2", name_es: "Press de banca", name_en: "Bench press" },
  { id: "3", name_es: "Press inclinado con mancuernas", name_en: "Incline dumbbell press" },
  { id: "4", name_es: "Curl de bíceps", name_en: "Biceps curl" },
  { id: "5", name_es: "Press militar", name_en: "Military press" },
];

describe("normalizeText", () => {
  it.each([
    ["Bíceps", "biceps"],
    ["PRENSA 45°", "prensa 45"],
    ["  press   de banca  ", "press de banca"],
    ["Curl-de-bíceps", "curl de biceps"],
  ])("normalizes %s to %s", (raw, expected) => {
    expect(normalizeText(raw)).toBe(expected);
  });
});

describe("resolveExerciseMatch", () => {
  it("resolves a clear single match", () => {
    const result = resolveExerciseMatch("prensa", catalog);
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.exercise.id).toBe("1");
    }
  });

  it("resolves a longer query to the matching full-name exercise", () => {
    const result = resolveExerciseMatch("press inclinado mancuernas", catalog);
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.exercise.id).toBe("3");
    }
  });

  it("matches across accents", () => {
    const result = resolveExerciseMatch("biceps", catalog);
    expect(result.kind).toBe("single");
    if (result.kind === "single") {
      expect(result.exercise.id).toBe("4");
    }
  });

  it("returns candidates for an ambiguous query", () => {
    const result = resolveExerciseMatch("press", catalog);
    expect(result.kind).toBe("candidates");
    if (result.kind === "candidates") {
      expect(result.exercises.length).toBeGreaterThan(1);
    }
  });

  it("returns none when nothing matches", () => {
    const result = resolveExerciseMatch("xyz", catalog);
    expect(result).toEqual({ kind: "none" });
  });
});
