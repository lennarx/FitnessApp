"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CardioForm } from "@/components/session/CardioForm";
import { DailyMetricsPanel } from "@/components/session/DailyMetricsPanel";
import { SessionExerciseCard } from "@/components/session/SessionExerciseCard";
import { SessionNotes } from "@/components/session/SessionNotes";
import { ExercisePickerModal } from "@/components/exercises/ExercisePickerModal";
import { db } from "@/lib/db";
import { endTrainingSession } from "@/lib/db/sessions";
import { useSessionLog, type SessionExerciseEntry } from "@/lib/db/useSessionLog";
import { formatSessionDate } from "@/lib/utils/dates";
import type { LocalExercise } from "@/types/entities";

export default function SessionLogPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [showCardioForm, setShowCardioForm] = useState(false);
  // Exercises added from the picker before their first set is logged — the
  // schema has no "session_exercises" table, so there's nowhere to persist
  // an empty addition. Once a set is saved it shows up via useSessionLog and
  // gets filtered out of this list below.
  const [pendingExtraExercises, setPendingExtraExercises] = useState<LocalExercise[]>([]);

  const session = useLiveQuery(() => db.training_sessions.get(sessionId), [sessionId]);
  const day = useLiveQuery(
    () => (session?.routine_day_id ? db.routine_days.get(session.routine_day_id) : undefined),
    [session?.routine_day_id]
  );
  const entries = useSessionLog(sessionId);

  const editable = session ? session.ended_at === null : false;

  const loggedExerciseIds = new Set(entries?.map((e) => e.exercise.id) ?? []);
  const visiblePending = pendingExtraExercises.filter((e) => !loggedExerciseIds.has(e.id));
  const allEntries: SessionExerciseEntry[] = [
    ...(entries ?? []),
    ...visiblePending.map((exercise) => ({ exercise, dayExercise: null, sets: [] })),
  ];

  function handleAddExercise(exercise: LocalExercise) {
    setPendingExtraExercises((prev) =>
      prev.some((e) => e.id === exercise.id) ? prev : [...prev, exercise]
    );
    setShowPicker(false);
  }

  async function handleCloseSession() {
    if (!confirm("¿Cerrar la sesión? No vas a poder editar los sets después.")) return;
    await endTrainingSession(sessionId);
    router.push("/sesion");
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{day?.day_label ?? "Sesión libre"}</h1>
        {session && (
          <span className="text-sm text-neutral-500">{formatSessionDate(session.session_date)}</span>
        )}
      </div>

      {!editable && (
        <p className="rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-500">
          Sesión cerrada — solo lectura.
        </p>
      )}

      <DailyMetricsPanel metricDate={session?.session_date ?? ""} />

      <div className="flex flex-col gap-2">
        {entries === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : (
          allEntries.map((entry) => (
            <SessionExerciseCard
              key={entry.exercise.id}
              entry={entry}
              sessionId={sessionId}
              editable={editable}
            />
          ))
        )}
      </div>

      {session && (
        <SessionNotes sessionId={sessionId} initialNotes={session.notes} editable={editable} />
      )}

      {editable && (
        <button
          onClick={() => setShowPicker(true)}
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white"
        >
          Agregar ejercicio
        </button>
      )}

      <button
        onClick={() => setShowCardioForm(true)}
        className="rounded-md border border-neutral-700 px-4 py-3 text-base font-medium text-neutral-100"
      >
        Registrar cardio / natación
      </button>

      {editable && (
        <button onClick={handleCloseSession} className="text-sm text-red-400">
          Cerrar sesión
        </button>
      )}

      {showPicker && (
        <ExercisePickerModal onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
      )}
      {showCardioForm && <CardioForm onClose={() => setShowCardioForm(false)} />}
    </main>
  );
}
