"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ExercisePickerModal } from "@/components/exercises/ExercisePickerModal";
import { RoutineDayExerciseRow } from "@/components/plan/RoutineDayExerciseRow";
import { db } from "@/lib/db";
import {
  createRoutineDayExercise,
  deleteRoutineDayExercise,
  moveRoutineDayExerciseDown,
  moveRoutineDayExerciseUp,
} from "@/lib/db/routines";

export default function RoutineDayPage() {
  const { dayId } = useParams<{ routineId: string; dayId: string }>();
  const [showPicker, setShowPicker] = useState(false);

  const day = useLiveQuery(() => db.routine_days.get(dayId), [dayId]);

  const dayExercises = useLiveQuery(async () => {
    const rows = await db.routine_day_exercises.where("routine_day_id").equals(dayId).toArray();
    const active = rows
      .filter((r) => r.deleted_at === null)
      .sort((a, b) => a.exercise_order - b.exercise_order);

    const exercises = await Promise.all(active.map((r) => db.exercises.get(r.exercise_id)));

    return active.map((r, i) => ({ dayExercise: r, exercise: exercises[i] }));
  }, [dayId]);

  async function handleSelectExercise(exerciseId: string) {
    const nextOrder =
      dayExercises && dayExercises.length > 0
        ? Math.max(...dayExercises.map(({ dayExercise }) => dayExercise.exercise_order)) + 1
        : 0;
    await createRoutineDayExercise({
      routine_day_id: dayId,
      exercise_id: exerciseId,
      exercise_order: nextOrder,
    });
    setShowPicker(false);
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{day?.day_label ?? "..."}</h1>
        <button
          onClick={() => setShowPicker(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Agregar ejercicio
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {dayExercises === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : dayExercises.length === 0 ? (
          <p className="text-neutral-500">Todavía no hay ejercicios en este día.</p>
        ) : (
          dayExercises.map(({ dayExercise, exercise }) => (
            <RoutineDayExerciseRow
              key={dayExercise.id}
              dayExercise={dayExercise}
              exercise={exercise}
              onMoveUp={() => moveRoutineDayExerciseUp(dayId, dayExercise.id)}
              onMoveDown={() => moveRoutineDayExerciseDown(dayId, dayExercise.id)}
              onDelete={() => deleteRoutineDayExercise(dayExercise.id)}
            />
          ))
        )}
      </div>

      {showPicker && (
        <ExercisePickerModal
          onSelect={(exercise) => handleSelectExercise(exercise.id)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </main>
  );
}
