import { isoToLocalDateTime } from "@/lib/utils/dates";
import { weightDeltas } from "@/lib/utils/parseWeight";
import type { ExportSnapshot } from "./readExportSnapshot";

export interface WorkbookSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number>[];
}

export interface WorkbookData {
  sheets: WorkbookSheet[];
}

const PLAN_HEADERS = [
  "rutina",
  "dia",
  "orden",
  "ejercicio",
  "series_objetivo",
  "reps_objetivo",
  "rir_objetivo",
  "descanso_seg",
  "notas_progresion",
];

function buildPlanSheet(snapshot: ExportSnapshot): WorkbookSheet {
  const routine = snapshot.routines.find((r) => r.is_active && r.deleted_at === null);
  if (!routine) return { name: "Plan", headers: PLAN_HEADERS, rows: [] };

  const exerciseNameById = new Map(snapshot.exercises.map((e) => [e.id, e.name_es]));

  const days = snapshot.routine_days
    .filter((d) => d.routine_id === routine.id && d.deleted_at === null)
    .sort((a, b) => a.day_order - b.day_order);

  const rows: Record<string, string | number>[] = [];
  for (const day of days) {
    const dayExercises = snapshot.routine_day_exercises
      .filter((e) => e.routine_day_id === day.id && e.deleted_at === null)
      .sort((a, b) => a.exercise_order - b.exercise_order);

    for (const de of dayExercises) {
      rows.push({
        rutina: routine.name,
        dia: day.day_label,
        orden: de.exercise_order,
        ejercicio: exerciseNameById.get(de.exercise_id) ?? de.exercise_id,
        series_objetivo: de.target_sets,
        reps_objetivo:
          de.target_reps_min === de.target_reps_max
            ? String(de.target_reps_min)
            : `${de.target_reps_min}-${de.target_reps_max}`,
        rir_objetivo: de.target_rir ?? "",
        descanso_seg: de.rest_seconds ?? "",
        notas_progresion: de.progression_notes ?? "",
      });
    }
  }

  return { name: "Plan", headers: PLAN_HEADERS, rows };
}

const REGISTRO_HEADERS = [
  "fecha",
  "tipo",
  "dia_rutina",
  "ejercicio",
  "serie",
  "carga_raw",
  "carga_kg",
  "reps",
  "rir",
  "cardio_tipo",
  "duracion_min",
  "metros",
  "intensidad",
  "sueño_h",
  "sensacion",
  "pasos",
  "notas_sesion",
];

function buildRegistroSheet(snapshot: ExportSnapshot): WorkbookSheet {
  const exerciseNameById = new Map(snapshot.exercises.map((e) => [e.id, e.name_es]));
  const dayLabelById = new Map(snapshot.routine_days.map((d) => [d.id, d.day_label]));
  const sessionById = new Map(snapshot.training_sessions.map((s) => [s.id, s]));
  const metricsByDate = new Map(snapshot.daily_metrics.map((m) => [m.metric_date, m]));

  function dayRutinaFor(routineDayId: string | null): string {
    if (!routineDayId) return "Libre";
    return dayLabelById.get(routineDayId) ?? "Libre";
  }

  interface Entry {
    fecha: string;
    orderWithinDay: number;
    row: Record<string, string | number>;
  }

  const entries: Entry[] = [];

  for (const set of snapshot.logged_sets) {
    if (set.deleted_at !== null) continue;
    const session = sessionById.get(set.training_session_id);
    const fecha = session?.session_date ?? "";
    const metrics = metricsByDate.get(fecha);
    entries.push({
      fecha,
      orderWithinDay: set.set_order,
      row: {
        fecha,
        tipo: "serie",
        dia_rutina: dayRutinaFor(session?.routine_day_id ?? null),
        ejercicio: exerciseNameById.get(set.exercise_id) ?? set.exercise_id,
        serie: set.set_order + 1,
        carga_raw: set.load_raw,
        carga_kg: set.load_normalized_kg ?? "",
        reps: set.reps,
        rir: set.rir ?? "",
        cardio_tipo: "",
        duracion_min: "",
        metros: "",
        intensidad: "",
        "sueño_h": metrics?.sleep_hours ?? "",
        sensacion: metrics?.feeling_1_10 ?? "",
        pasos: metrics?.steps ?? "",
        notas_sesion: session?.notes ?? "",
      },
    });
  }

  // Cardio has no set_order of its own; sorting it after every set on the
  // same date (rather than interleaving by created_at) keeps the sheet
  // stable regardless of when the cardio row was actually saved.
  for (const cardio of snapshot.cardio_sessions) {
    const session = cardio.training_session_id
      ? sessionById.get(cardio.training_session_id)
      : undefined;
    const fecha = cardio.session_date;
    const metrics = metricsByDate.get(fecha);
    entries.push({
      fecha,
      orderWithinDay: Number.POSITIVE_INFINITY,
      row: {
        fecha,
        tipo: "cardio",
        dia_rutina: dayRutinaFor(session?.routine_day_id ?? null),
        ejercicio: "",
        serie: "",
        carga_raw: "",
        carga_kg: "",
        reps: "",
        rir: "",
        cardio_tipo: cardio.activity_type,
        duracion_min: cardio.duration_minutes,
        metros: cardio.distance_meters ?? "",
        intensidad:
          cardio.intensity_raw ??
          (cardio.intensity_rpe !== null ? `RPE ${cardio.intensity_rpe}` : ""),
        "sueño_h": metrics?.sleep_hours ?? "",
        sensacion: metrics?.feeling_1_10 ?? "",
        pasos: metrics?.steps ?? "",
        notas_sesion: session?.notes ?? cardio.notes ?? "",
      },
    });
  }

  entries.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    if (a.orderWithinDay !== b.orderWithinDay) return a.orderWithinDay - b.orderWithinDay;

    const aEjercicio = String(a.row.ejercicio ?? "");
    const bEjercicio = String(b.row.ejercicio ?? "");
    if (aEjercicio !== bEjercicio) return aEjercicio.localeCompare(bEjercicio);

    return String(a.row.tipo ?? "").localeCompare(String(b.row.tipo ?? ""));
  });

  return { name: "Registro", headers: REGISTRO_HEADERS, rows: entries.map((e) => e.row) };
}

const COMIDAS_HEADERS = [
  "fecha",
  "hora",
  "texto_crudo",
  "texto_estructurado",
  "porcion",
  "porcion_g",
  "entrenamiento",
  "estado_parse",
  "pasos",
];

function buildComidasSheet(snapshot: ExportSnapshot): WorkbookSheet {
  const metricsByDate = new Map(snapshot.daily_metrics.map((m) => [m.metric_date, m]));

  const meals = snapshot.meals
    .filter((m) => m.deleted_at === null)
    .slice()
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  const rows = meals.map((meal) => {
    const { fecha, hora } = isoToLocalDateTime(meal.occurred_at);
    const metrics = metricsByDate.get(fecha);
    return {
      fecha,
      hora,
      texto_crudo: meal.raw_text,
      texto_estructurado: meal.structured_text ?? "",
      porcion: meal.portion_raw ?? "",
      porcion_g: meal.portion_grams ?? "",
      entrenamiento: meal.training_day_flag ? "sí" : "no",
      estado_parse: meal.parse_status,
      pasos: metrics?.steps ?? "",
    };
  });

  return { name: "Comidas", headers: COMIDAS_HEADERS, rows };
}

const PESO_HEADERS = ["fecha", "kg", "delta", "notas"];

function buildPesoSheet(snapshot: ExportSnapshot): WorkbookSheet {
  // weightDeltas expects newest-first input and computes each delta against
  // the next-older row; sort descending for that, then reverse for the
  // export's chronological (oldest-first) order.
  const newestFirst = snapshot.body_weight
    .filter((w) => w.deleted_at === null)
    .slice()
    .sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  const rows = weightDeltas(newestFirst)
    .slice()
    .reverse()
    .map(({ entry, delta_kg }) => ({
      fecha: entry.measured_at,
      kg: entry.weight_kg,
      delta: delta_kg ?? "",
      notas: entry.notes ?? "",
    }));

  return { name: "Peso", headers: PESO_HEADERS, rows };
}

const METRICAS_HEADERS = ["fecha", "sueño_h", "sensacion", "pasos"];

function buildMetricasSheet(snapshot: ExportSnapshot): WorkbookSheet {
  const rows = snapshot.daily_metrics
    .filter((m) => m.sleep_hours !== null || m.feeling_1_10 !== null || m.steps !== null)
    .slice()
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .map((m) => ({
      fecha: m.metric_date,
      "sueño_h": m.sleep_hours ?? "",
      sensacion: m.feeling_1_10 ?? "",
      pasos: m.steps ?? "",
    }));

  return { name: "Metricas", headers: METRICAS_HEADERS, rows };
}

/**
 * Pure row-shaping for the Excel export: takes a flat Dexie snapshot and
 * returns plain arrays per sheet. Soft-deleted rows are excluded here (never
 * upstream in readExportSnapshot) so the exclusion is something a test can
 * see. nl_inbox is intentionally not read/exported — it's a work queue, not
 * user data.
 */
export function buildWorkbookData(snapshot: ExportSnapshot): WorkbookData {
  return {
    sheets: [
      buildPlanSheet(snapshot),
      buildRegistroSheet(snapshot),
      buildComidasSheet(snapshot),
      buildPesoSheet(snapshot),
      buildMetricasSheet(snapshot),
    ],
  };
}
