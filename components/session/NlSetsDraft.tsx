"use client";

import { useMemo, useState } from "react";
import { ExerciseListItem } from "@/components/exercises/ExerciseListItem";
import { ExercisePickerModal } from "@/components/exercises/ExercisePickerModal";
import { Modal } from "@/components/ui/Modal";
import { createLoggedSet } from "@/lib/db/sessions";
import { useExercises } from "@/lib/db/useExercises";
import { resolveExerciseMatch } from "@/lib/parse/matchExercise";
import type { ParsedSet } from "@/lib/parse/validateParseResult";
import type { LocalExercise } from "@/types/entities";

interface DraftRow {
  load_raw: string;
  reps: string;
  rir: string;
}

function toDraftRows(sets: ParsedSet[]): DraftRow[] {
  return sets.map((s) => ({
    load_raw: s.load_raw,
    reps: String(s.reps),
    rir: s.rir === null ? "" : String(s.rir),
  }));
}

function isRowValid(row: DraftRow): boolean {
  if (!row.load_raw.trim() || !row.reps.trim()) return false;
  const reps = Number(row.reps);
  if (!Number.isInteger(reps) || reps <= 0) return false;
  if (row.rir.trim() !== "") {
    const rir = Number(row.rir);
    if (!Number.isInteger(rir)) return false;
  }
  return true;
}

/**
 * Confirmable draft for a parsed "sets" result — nothing here is saved until
 * "Confirmar y guardar" is pressed. Exercise resolution reuses the same
 * catalog data as the picker (all ~870 rows, filtered client-side) so a
 * "candidates" match can be rendered without a second query shape.
 */
export function NlSetsDraft({
  sessionId,
  exerciseQuery,
  initialSets,
  onCancel,
  onConfirmed,
}: {
  sessionId: string;
  exerciseQuery: string;
  initialSets: ParsedSet[];
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const allExercises = useExercises("", "");
  const [selectedExercise, setSelectedExercise] = useState<LocalExercise | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>(toDraftRows(initialSets));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [autoResolved, setAutoResolved] = useState(false);

  const match = useMemo(() => {
    if (!allExercises) return null;
    return resolveExerciseMatch(
      exerciseQuery,
      allExercises.map((e) => ({ id: e.id, name_es: e.name_es, name_en: e.name_en }))
    );
  }, [allExercises, exerciseQuery]);

  // Runs once, when the catalog + match are first available — auto-picks a
  // clear single match and auto-opens the full picker when nothing matched,
  // without fighting the user's own selection on later renders. Done during
  // render (guarded by autoResolved), same pattern as DailyMetricsPanel's
  // hydration guard, rather than in an effect.
  if (!autoResolved && match && allExercises) {
    setAutoResolved(true);

    if (match.kind === "single") {
      const found = allExercises.find((e) => e.id === match.exercise.id) ?? null;
      setSelectedExercise(found);
    } else if (match.kind === "none") {
      setShowPicker(true);
    }
  }

  const candidateExercises =
    match?.kind === "candidates" && allExercises
      ? match.exercises
          .map((c) => allExercises.find((e) => e.id === c.id))
          .filter((e): e is LocalExercise => e !== undefined)
      : [];

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows((prev) => [...prev, { load_raw: "", reps: "", rir: "" }]);
  }

  const canConfirm = selectedExercise !== null && rows.length > 0 && rows.every(isRowValid);

  async function handleConfirm() {
    if (!selectedExercise || !canConfirm) return;
    setSaving(true);
    setError(false);
    try {
      // Awaited sequentially (not Promise.all) so each createLoggedSet's own
      // transaction sees the previous row already committed and picks the
      // next set_order correctly.
      for (const row of rows) {
        await createLoggedSet({
          training_session_id: sessionId,
          exercise_id: selectedExercise.id,
          load_raw: row.load_raw,
          reps: Number(row.reps),
          rir: row.rir.trim() === "" ? null : Number(row.rir),
        });
      }
      onConfirmed();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Confirmar registro" onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-400">Ejercicio</span>
          {selectedExercise ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
              <span className="text-base">{selectedExercise.name_es}</span>
              <button
                onClick={() => setShowPicker(true)}
                className="text-sm text-neutral-400 underline"
              >
                Cambiar
              </button>
            </div>
          ) : match?.kind === "candidates" ? (
            <div className="flex flex-col gap-2">
              {candidateExercises.map((exercise) => (
                <ExerciseListItem
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => setSelectedExercise(exercise)}
                />
              ))}
              <button onClick={() => setShowPicker(true)} className="text-sm text-neutral-400 underline">
                Ver todos
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPicker(true)}
              className="rounded-md border border-neutral-700 px-4 py-3 text-base text-neutral-100"
            >
              Elegir ejercicio
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-neutral-400">Series</span>
          {rows.map((row, i) => (
            <div key={i} className="flex items-end gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
              <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
                Carga
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.load_raw}
                  onChange={(e) => updateRow(i, { load_raw: e.target.value })}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
                Reps
                <input
                  type="number"
                  inputMode="numeric"
                  value={row.reps}
                  onChange={(e) => updateRow(i, { reps: e.target.value })}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
                />
              </label>
              <label className="flex w-16 flex-col gap-1 text-sm text-neutral-400">
                RIR
                <input
                  type="number"
                  inputMode="numeric"
                  value={row.rir}
                  onChange={(e) => updateRow(i, { rir: e.target.value })}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
                />
              </label>
              <button onClick={() => removeRow(i)} className="px-2 py-2 text-red-400" aria-label="Quitar serie">
                ✕
              </button>
            </div>
          ))}
          <button onClick={addRow} className="text-sm text-neutral-400 underline">
            + Agregar serie
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!canConfirm || saving}
          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Confirmar y guardar"}
        </button>
        {error && (
          <p className="text-sm text-red-400">
            Algo salió mal guardando las series. Revisá cuáles quedaron cargadas y probá de nuevo.
          </p>
        )}
      </div>

      {showPicker && (
        <ExercisePickerModal
          onSelect={(exercise) => {
            setSelectedExercise(exercise);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </Modal>
  );
}
