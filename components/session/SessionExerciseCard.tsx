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

  // sets already filters out soft-deleted rows, so sets.length undercounts
  // once a mid-session set is deleted (e.g. sets 0,1,2 logged, 1 deleted ->
  // sets.length is 2, but set_order 2 is still taken -> a naive "length as
  // next order" would collide with it). max+1 always lands on an unused
  // set_order regardless of gaps from deletions.
  const nextSetOrder =
    sets.length > 0 ? Math.max(...sets.map((s) => s.set_order)) + 1 : 0;
  // Still used as the index for "match por nº de serie" against the last
  // session's sets — gaps just mean the fallback (last available set) kicks
  // in a little earlier, which is an acceptable prefill degradation.
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
