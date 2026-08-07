"use client";

import { useState } from "react";
import { ExerciseListItem } from "@/components/exercises/ExerciseListItem";
import { ExerciseSearchFilter } from "@/components/exercises/ExerciseSearchFilter";
import { Modal } from "@/components/ui/Modal";
import { useExercises } from "@/lib/db/useExercises";
import type { LocalExercise } from "@/types/entities";

export function ExercisePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: LocalExercise) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const exercises = useExercises(search, muscleGroup);

  return (
    <Modal title="Elegir ejercicio" onClose={onClose}>
      <div className="flex flex-col gap-4">
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
              <ExerciseListItem
                key={exercise.id}
                exercise={exercise}
                onClick={() => onSelect(exercise)}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
