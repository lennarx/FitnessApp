"use client";

import { useState } from "react";
import { LoggedSetRow } from "@/components/session/LoggedSetRow";
import { SetDraftRow } from "@/components/session/SetDraftRow";
import { createLoggedSet } from "@/lib/db/sessions";
import { useLastSessionSets } from "@/lib/db/useLastSessionSets";
import type { SessionExerciseEntry } from "@/lib/db/useSessionLog";

export function SessionExerciseCard({
  entry,
  sessionId,
  editable,
}: {
  entry: SessionExerciseEntry;
  sessionId: string;
  editable: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const lastSets = useLastSessionSets(entry.exercise.id, sessionId);

  const { exercise, dayExercise, sets } = entry;

  const summary = dayExercise
    ? [
        `${dayExercise.target_sets} series`,
        `${dayExercise.target_reps_min}-${dayExercise.target_reps_max} reps`,
        dayExercise.target_rir !== null ? `RIR ${dayExercise.target_rir}` : "",
        dayExercise.rest_seconds !== null ? `${dayExercise.rest_seconds}s descanso` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "Agregado a la sesión";

  // set_order is 0-indexed, so it also doubles as "how many sets are
  // already logged" — the index into last session's sets for the same
  // set number (match por nº de serie, cae a la última si faltan).
  const nextSetOrder = sets.length;
  const prefillSet = lastSets
    ? (lastSets[nextSetOrder] ?? lastSets[lastSets.length - 1])
    : undefined;

  async function handleRegisterSet(input: {
    load_raw: string;
    reps: number;
    rir: number | null;
  }) {
    await createLoggedSet({
      training_session_id: sessionId,
      exercise_id: exercise.id,
      set_order: nextSetOrder,
      ...input,
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between text-left"
      >
        <div className="flex flex-col">
          <span className="text-base">{exercise.name_es}</span>
          <span className="text-sm text-neutral-500">{summary}</span>
        </div>
        <span className="text-sm text-neutral-400">
          {sets.length}/{dayExercise?.target_sets ?? sets.length} series
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2">
          {dayExercise?.progression_notes && (
            <p className="text-sm text-neutral-500">{dayExercise.progression_notes}</p>
          )}
          {sets.map((set) => (
            <LoggedSetRow key={set.id} set={set} editable={editable} />
          ))}
          {editable && (
            <SetDraftRow
              key={nextSetOrder}
              initialLoadRaw={prefillSet?.load_raw ?? ""}
              initialReps={prefillSet ? String(prefillSet.reps) : ""}
              onSubmit={handleRegisterSet}
            />
          )}
        </div>
      )}
    </div>
  );
}
