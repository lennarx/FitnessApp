"use client";

import { useState } from "react";
import { ExerciseListItem } from "@/components/exercises/ExerciseListItem";
import { ExerciseSearchFilter } from "@/components/exercises/ExerciseSearchFilter";
import { NewExerciseForm } from "@/components/exercises/NewExerciseForm";
import { useExercises } from "@/lib/db/useExercises";

export default function EjerciciosPage() {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const exercises = useExercises(search, muscleGroup);

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ejercicios</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Nuevo ejercicio
        </button>
      </div>

      <ExerciseSearchFilter
        search={search}
        onSearchChange={setSearch}
        muscleGroup={muscleGroup}
        onMuscleGroupChange={setMuscleGroup}
      />

      <div className="flex flex-col gap-2">
        {exercises === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : exercises.length === 0 ? (
          <p className="text-neutral-500">Sin resultados.</p>
        ) : (
          exercises.map((exercise) => (
            <ExerciseListItem key={exercise.id} exercise={exercise} />
          ))
        )}
      </div>

      {showNewForm && <NewExerciseForm onClose={() => setShowNewForm(false)} />}
    </main>
  );
}
