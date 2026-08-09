"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { updateRoutineDayExercise } from "@/lib/db/routines";
import type { LocalRoutineDayExercise } from "@/types/entities";

export function TargetsForm({
  dayExercise,
  onClose,
}: {
  dayExercise: LocalRoutineDayExercise;
  onClose: () => void;
}) {
  const [sets, setSets] = useState(String(dayExercise.target_sets));
  const [repsMin, setRepsMin] = useState(String(dayExercise.target_reps_min));
  const [repsMax, setRepsMax] = useState(String(dayExercise.target_reps_max));
  const [rir, setRir] = useState(dayExercise.target_rir?.toString() ?? "");
  const [restSeconds, setRestSeconds] = useState(dayExercise.rest_seconds?.toString() ?? "");
  const [notes, setNotes] = useState(dayExercise.progression_notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateRoutineDayExercise(dayExercise.id, {
      target_sets: Number(sets),
      target_reps_min: Number(repsMin),
      target_reps_max: Number(repsMax),
      target_rir: rir === "" ? null : Number(rir),
      rest_seconds: restSeconds === "" ? null : Number(restSeconds),
      progression_notes: notes.trim() === "" ? null : notes.trim(),
    });
    onClose();
  }

  return (
    <Modal title="Targets" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Series
          <input
            type="number"
            inputMode="numeric"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
            Reps mín.
            <input
              type="number"
              inputMode="numeric"
              value={repsMin}
              onChange={(e) => setRepsMin(e.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
            Reps máx.
            <input
              type="number"
              inputMode="numeric"
              value={repsMax}
              onChange={(e) => setRepsMax(e.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          RIR objetivo
          <input
            type="number"
            inputMode="numeric"
            value={rir}
            onChange={(e) => setRir(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Descanso (segundos)
          <input
            type="number"
            inputMode="numeric"
            value={restSeconds}
            onChange={(e) => setRestSeconds(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Notas de progresión
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white"
        >
          Guardar
        </button>
      </form>
    </Modal>
  );
}
