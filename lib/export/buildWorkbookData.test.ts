import { describe, expect, it } from "vitest";
import { buildWorkbookData } from "./buildWorkbookData";
import type { ExportSnapshot } from "./readExportSnapshot";
import type {
  LocalBodyWeight,
  LocalCardioSession,
  LocalDailyMetrics,
  LocalExercise,
  LocalLoggedSet,
  LocalMeal,
  LocalRoutine,
  LocalRoutineDay,
  LocalRoutineDayExercise,
  LocalTrainingSession,
} from "@/types/entities";

const USER = "u1";

function emptySnapshot(): ExportSnapshot {
  return {
    routines: [],
    routine_days: [],
    routine_day_exercises: [],
    exercises: [],
    training_sessions: [],
    logged_sets: [],
    cardio_sessions: [],
    meals: [],
    body_weight: [],
    daily_metrics: [],
  };
}

function makeRoutine(overrides: Partial<LocalRoutine> & { id: string }): LocalRoutine {
  return {
    user_id: USER,
    created_at: "2026-01-01T00:00:00.000Z",
    name: "Rutina",
    is_active: true,
    deleted_at: null,
    synced: 1,
    ...overrides,
  };
}

function makeDay(overrides: Partial<LocalRoutineDay> & { id: string }): LocalRoutineDay {
  return {
    user_id: USER,
    created_at: "2026-01-01T00:00:00.000Z",
    routine_id: "r1",
    day_label: "Día",
    day_order: 0,
    notes: null,
    deleted_at: null,
    synced: 1,
    ...overrides,
  };
}

function makeDayExercise(
  overrides: Partial<LocalRoutineDayExercise> & { id: string }
): LocalRoutineDayExercise {
  return {
    user_id: USER,
    created_at: "2026-01-01T00:00:00.000Z",
    routine_day_id: "d1",
    exercise_id: "e1",
    exercise_order: 0,
    target_sets: 3,
    target_reps_min: 8,
    target_reps_max: 12,
    target_rir: 2,
    rest_seconds: 90,
    progression_notes: null,
    deleted_at: null,
    synced: 1,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<LocalExercise> & { id: string }): LocalExercise {
  return {
    user_id: USER,
    created_at: "2026-01-01T00:00:00.000Z",
    name_es: "Ejercicio",
    name_en: null,
    muscle_group: "pecho",
    equipment: null,
    image_url: null,
    is_custom: false,
    source: "seed",
    synced: 1,
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<LocalTrainingSession> & { id: string }
): LocalTrainingSession {
  return {
    user_id: USER,
    created_at: "2026-08-01T12:00:00.000Z",
    routine_day_id: null,
    session_date: "2026-08-01",
    started_at: "2026-08-01T12:00:00.000Z",
    ended_at: null,
    notes: null,
    synced: 1,
    ...overrides,
  };
}

function makeSet(overrides: Partial<LocalLoggedSet> & { id: string }): LocalLoggedSet {
  return {
    user_id: USER,
    created_at: "2026-08-01T12:00:00.000Z",
    training_session_id: "s1",
    exercise_id: "e1",
    set_order: 0,
    reps: 10,
    rir: 2,
    load_raw: "40kg",
    load_normalized_kg: 40,
    deleted_at: null,
    synced: 1,
    ...overrides,
  };
}

function makeCardio(
  overrides: Partial<LocalCardioSession> & { id: string }
): LocalCardioSession {
  return {
    user_id: USER,
    created_at: "2026-08-01T12:00:00.000Z",
    training_session_id: null,
    session_date: "2026-08-01",
    activity_type: "swim",
    duration_minutes: 30,
    distance_meters: 1000,
    intensity_raw: null,
    intensity_rpe: null,
    notes: null,
    synced: 1,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<LocalMeal> & { id: string }): LocalMeal {
  return {
    user_id: USER,
    created_at: "2026-08-01T12:00:00.000Z",
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

function makeWeight(overrides: Partial<LocalBodyWeight> & { id: string }): LocalBodyWeight {
  return {
    user_id: USER,
    created_at: "2026-08-01T00:00:00.000Z",
    measured_at: "2026-08-01",
    weight_kg: 80,
    notes: null,
    deleted_at: null,
    synced: 1,
    ...overrides,
  };
}

function makeMetrics(
  overrides: Partial<LocalDailyMetrics> & { id: string }
): LocalDailyMetrics {
  return {
    user_id: USER,
    created_at: "2026-08-01T00:00:00.000Z",
    metric_date: "2026-08-01",
    sleep_hours: null,
    feeling_1_10: null,
    steps: null,
    synced: 1,
    ...overrides,
  };
}

function sheet(data: ReturnType<typeof buildWorkbookData>, name: string) {
  const s = data.sheets.find((x) => x.name === name);
  if (!s) throw new Error(`sheet ${name} not found`);
  return s;
}

describe("buildWorkbookData", () => {
  it("emits every sheet with only headers when there is no data", () => {
    const data = buildWorkbookData(emptySnapshot());
    expect(data.sheets.map((s) => s.name)).toEqual(["Plan", "Registro", "Comidas", "Peso", "Metricas"]);
    for (const s of data.sheets) {
      expect(s.rows).toEqual([]);
      expect(s.headers.length).toBeGreaterThan(0);
    }
  });

  describe("Plan sheet", () => {
    it("only exports the active, non-deleted routine, ordered by day and exercise order", () => {
      const snapshot = emptySnapshot();
      snapshot.routines = [
        makeRoutine({ id: "r1", name: "Push/Pull/Legs", is_active: true }),
        makeRoutine({ id: "r2", name: "Vieja", is_active: false }),
        makeRoutine({ id: "r3", name: "Borrada", is_active: true, deleted_at: "2026-01-01T00:00:00.000Z" }),
      ];
      snapshot.routine_days = [
        makeDay({ id: "d2", routine_id: "r1", day_label: "Pull", day_order: 1 }),
        makeDay({ id: "d1", routine_id: "r1", day_label: "Push", day_order: 0 }),
        makeDay({ id: "d0", routine_id: "r2", day_label: "Día viejo", day_order: 0 }),
      ];
      snapshot.exercises = [
        makeExercise({ id: "e1", name_es: "Press banca" }),
        makeExercise({ id: "e2", name_es: "Remo" }),
      ];
      snapshot.routine_day_exercises = [
        makeDayExercise({
          id: "de1",
          routine_day_id: "d1",
          exercise_id: "e1",
          exercise_order: 0,
          target_sets: 4,
          target_reps_min: 8,
          target_reps_max: 8,
          target_rir: 1,
          rest_seconds: 120,
          progression_notes: "sumar 2.5kg",
        }),
        makeDayExercise({
          id: "de2",
          routine_day_id: "d2",
          exercise_id: "e2",
          exercise_order: 0,
          target_reps_min: 8,
          target_reps_max: 12,
        }),
        makeDayExercise({
          id: "de3",
          routine_day_id: "d1",
          exercise_id: "e1",
          deleted_at: "2026-01-01T00:00:00.000Z",
        }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Plan").rows;

      expect(rows).toEqual([
        {
          rutina: "Push/Pull/Legs",
          dia: "Push",
          orden: 0,
          ejercicio: "Press banca",
          series_objetivo: 4,
          reps_objetivo: "8",
          rir_objetivo: 1,
          descanso_seg: 120,
          notas_progresion: "sumar 2.5kg",
        },
        {
          rutina: "Push/Pull/Legs",
          dia: "Pull",
          orden: 0,
          ejercicio: "Remo",
          series_objetivo: 3,
          reps_objetivo: "8-12",
          rir_objetivo: 2,
          descanso_seg: 90,
          notas_progresion: "",
        },
      ]);
    });
  });

  describe("Registro sheet", () => {
    it("excludes soft-deleted sets and orders chronologically by date then set_order", () => {
      const snapshot = emptySnapshot();
      snapshot.exercises = [makeExercise({ id: "e1", name_es: "Sentadilla" })];
      snapshot.training_sessions = [
        makeSession({ id: "s1", session_date: "2026-08-02" }),
        makeSession({ id: "s0", session_date: "2026-08-01" }),
      ];
      snapshot.logged_sets = [
        makeSet({ id: "set-a", training_session_id: "s1", set_order: 0 }),
        makeSet({ id: "set-b", training_session_id: "s0", set_order: 1 }),
        makeSet({ id: "set-c", training_session_id: "s0", set_order: 0 }),
        makeSet({ id: "set-deleted", training_session_id: "s0", set_order: 0, deleted_at: "x" }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Registro").rows;

      expect(rows.map((r) => `${r.fecha}|${r.serie}`)).toEqual([
        "2026-08-01|1",
        "2026-08-01|2",
        "2026-08-02|1",
      ]);
    });

    it("resolves routine day label via the session, falling back to Libre", () => {
      const snapshot = emptySnapshot();
      snapshot.exercises = [makeExercise({ id: "e1" })];
      snapshot.routine_days = [makeDay({ id: "d1", day_label: "Push A" })];
      snapshot.training_sessions = [
        makeSession({ id: "s1", routine_day_id: "d1" }),
        makeSession({ id: "s2", routine_day_id: null }),
      ];
      snapshot.logged_sets = [
        makeSet({ id: "set1", training_session_id: "s1" }),
        makeSet({ id: "set2", training_session_id: "s2" }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Registro").rows;
      expect(rows.map((r) => r.dia_rutina)).toEqual(["Push A", "Libre"]);
    });

    it("keeps load_raw as the source of truth and leaves carga_kg blank when unparseable", () => {
      const snapshot = emptySnapshot();
      snapshot.exercises = [makeExercise({ id: "e1" })];
      snapshot.training_sessions = [makeSession({ id: "s1" })];
      snapshot.logged_sets = [
        makeSet({ id: "set1", load_raw: "I10-D10", load_normalized_kg: null }),
      ];

      const row = sheet(buildWorkbookData(snapshot), "Registro").rows[0];
      expect(row.carga_raw).toBe("I10-D10");
      expect(row.carga_kg).toBe("");
    });

    it("includes cardio sessions with tipo=cardio and blank set columns, sorted after sets on the same date", () => {
      const snapshot = emptySnapshot();
      snapshot.exercises = [makeExercise({ id: "e1" })];
      snapshot.training_sessions = [makeSession({ id: "s1", session_date: "2026-08-01" })];
      snapshot.logged_sets = [makeSet({ id: "set1", training_session_id: "s1" })];
      snapshot.cardio_sessions = [
        makeCardio({ id: "c1", session_date: "2026-08-01", activity_type: "swim", distance_meters: 800 }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Registro").rows;
      expect(rows).toHaveLength(2);
      expect(rows[0].tipo).toBe("serie");
      expect(rows[1]).toMatchObject({
        tipo: "cardio",
        ejercicio: "",
        serie: "",
        cardio_tipo: "swim",
        metros: 800,
      });
    });

    it("denormalizes daily_metrics onto every row for that date", () => {
      const snapshot = emptySnapshot();
      snapshot.exercises = [makeExercise({ id: "e1" })];
      snapshot.training_sessions = [makeSession({ id: "s1", session_date: "2026-08-01" })];
      snapshot.logged_sets = [
        makeSet({ id: "set1", training_session_id: "s1", set_order: 0 }),
        makeSet({ id: "set2", training_session_id: "s1", set_order: 1 }),
      ];
      snapshot.daily_metrics = [
        makeMetrics({ id: "m1", metric_date: "2026-08-01", sleep_hours: 7.5, feeling_1_10: 8, steps: 9000 }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Registro").rows;
      for (const row of rows) {
        expect(row["sueño_h"]).toBe(7.5);
        expect(row.sensacion).toBe(8);
        expect(row.pasos).toBe(9000);
      }
    });
  });

  describe("Comidas sheet", () => {
    it("excludes soft-deleted meals, includes unparsed as a terminal state, and orders by occurred_at", () => {
      const snapshot = emptySnapshot();
      snapshot.meals = [
        makeMeal({ id: "m2", occurred_at: "2026-08-02T10:00:00.000Z", raw_text: "segunda" }),
        makeMeal({ id: "m1", occurred_at: "2026-08-01T10:00:00.000Z", raw_text: "primera", parse_status: "unparsed" }),
        makeMeal({ id: "m3", occurred_at: "2026-08-01T09:00:00.000Z", raw_text: "borrada", deleted_at: "x" }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Comidas").rows;
      expect(rows.map((r) => r.texto_crudo)).toEqual(["primera", "segunda"]);
      expect(rows[0].estado_parse).toBe("unparsed");
    });

    it("maps training_day_flag to sí/no and pulls pasos from daily_metrics", () => {
      const snapshot = emptySnapshot();
      snapshot.meals = [
        makeMeal({ id: "m1", occurred_at: "2026-08-01T10:00:00.000Z", training_day_flag: true }),
      ];
      snapshot.daily_metrics = [makeMetrics({ id: "dm1", metric_date: "2026-08-01", steps: 5000 })];

      const row = sheet(buildWorkbookData(snapshot), "Comidas").rows[0];
      expect(row.entrenamiento).toBe("sí");
      expect(row.pasos).toBe(5000);
    });
  });

  describe("Peso sheet", () => {
    it("excludes soft-deleted entries and orders chronologically ascending with correct deltas", () => {
      const snapshot = emptySnapshot();
      snapshot.body_weight = [
        makeWeight({ id: "w1", measured_at: "2026-08-01", weight_kg: 83 }),
        makeWeight({ id: "w2", measured_at: "2026-08-03", weight_kg: 82 }),
        makeWeight({ id: "w3", measured_at: "2026-08-02", weight_kg: 82.5 }),
        makeWeight({ id: "w4", measured_at: "2026-08-04", weight_kg: 999, deleted_at: "x" }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Peso").rows;
      expect(rows).toEqual([
        { fecha: "2026-08-01", kg: 83, delta: "", notas: "" },
        { fecha: "2026-08-02", kg: 82.5, delta: -0.5, notas: "" },
        { fecha: "2026-08-03", kg: 82, delta: -0.5, notas: "" },
      ]);
    });
  });

  describe("Metricas sheet", () => {
    it("only includes dates with at least one field set, ordered chronologically", () => {
      const snapshot = emptySnapshot();
      snapshot.daily_metrics = [
        makeMetrics({ id: "m2", metric_date: "2026-08-02", steps: 8000 }),
        makeMetrics({ id: "m1", metric_date: "2026-08-01", sleep_hours: 7 }),
        makeMetrics({ id: "m3", metric_date: "2026-08-03" }),
      ];

      const rows = sheet(buildWorkbookData(snapshot), "Metricas").rows;
      expect(rows).toEqual([
        { fecha: "2026-08-01", "sueño_h": 7, sensacion: "", pasos: "" },
        { fecha: "2026-08-02", "sueño_h": "", sensacion: "", pasos: 8000 },
      ]);
    });
  });
});
