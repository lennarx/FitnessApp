"use client";

import { useState } from "react";
import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import { TargetsForm } from "@/components/plan/TargetsForm";
import type { LocalExercise, LocalRoutineDayExercise } from "@/types/entities";

export function RoutineDayExerciseRow({
  dayExercise,
  exercise,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  dayExercise: LocalRoutineDayExercise;
  exercise: LocalExercise | undefined;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting || !confirm(`¿Borrar "${exercise?.name_es ?? "este ejercicio"}" de este día?`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const rir = dayExercise.target_rir !== null ? `RIR ${dayExercise.target_rir}` : "";
  const rest = dayExercise.rest_seconds !== null ? `${dayExercise.rest_seconds}s descanso` : "";
  const summary = [
    `${dayExercise.target_sets} series`,
    `${dayExercise.target_reps_min}-${dayExercise.target_reps_max} reps`,
    rir,
    rest,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <ExerciseThumbnail imageUrl={exercise?.image_url ?? null} alt={exercise?.name_es ?? ""} />
      <button
        onClick={() => setEditing(true)}
        className="flex flex-1 flex-col items-start text-left"
      >
        <span className="text-base">{exercise?.name_es ?? "..."}</span>
        <span className="text-sm text-neutral-500">{summary}</span>
      </button>
      <div className="flex flex-col gap-1">
        <button onClick={onMoveUp} className="px-2 py-1 text-neutral-400" aria-label="Subir">
          ▲
        </button>
        <button onClick={onMoveDown} className="px-2 py-1 text-neutral-400" aria-label="Bajar">
          ▼
        </button>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-2 text-sm text-red-400 disabled:opacity-50"
        aria-label="Borrar"
      >
        ✕
      </button>

      {editing && <TargetsForm dayExercise={dayExercise} onClose={() => setEditing(false)} />}
    </div>
  );
}
