"use client";

import { useState } from "react";
import { ExerciseListItem } from "@/components/exercises/ExerciseListItem";
import { ExerciseSearchFilter } from "@/components/exercises/ExerciseSearchFilter";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useExercises } from "@/lib/db/useExercises";
import { useExerciseHistory } from "@/lib/db/useExerciseHistory";
import { useLoggedExerciseIds } from "@/lib/db/useLoggedExerciseIds";
import type { LocalExercise } from "@/types/entities";

export default function HistorialPage() {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<LocalExercise | null>(null);

  const loggedIds = useLoggedExerciseIds();
  const exercises = useExercises(search, muscleGroup);
  const loggedExercises = exercises?.filter((e) => loggedIds?.has(e.id));

  const history = useExerciseHistory(selectedExercise?.id ?? "");

  if (selectedExercise) {
    return (
      <main className="flex flex-col gap-4 p-4 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{selectedExercise.name_es}</h1>
          <button onClick={() => setSelectedExercise(null)} className="text-sm text-neutral-400">
            Cambiar ejercicio
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {history === undefined ? (
            <p className="text-neutral-500">Cargando...</p>
          ) : history.length === 0 ? (
            <p className="text-neutral-500">Sin sesiones registradas.</p>
          ) : (
            history.map((entry) => <HistorySessionCard key={entry.session.id} entry={entry} />)
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-lg font-semibold">Historial</h1>

      {loggedIds === undefined || loggedIds.size > 0 ? (
        <ExerciseSearchFilter
          search={search}
          onSearchChange={setSearch}
          muscleGroup={muscleGroup}
          onMuscleGroupChange={setMuscleGroup}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        {loggedIds === undefined || exercises === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : loggedIds.size === 0 ? (
          <EmptyState
            message="Todavía no registraste ningún set."
            cta={{ label: "Ir a Sesión", href: "/sesion" }}
          />
        ) : loggedExercises === undefined || loggedExercises.length === 0 ? (
          <p className="text-neutral-500">Sin resultados.</p>
        ) : (
          loggedExercises.map((exercise) => (
            <ExerciseListItem
              key={exercise.id}
              exercise={exercise}
              onClick={() => setSelectedExercise(exercise)}
            />
          ))
        )}
      </div>
    </main>
  );
}
