"use client";

import { ExerciseThumbnail } from "@/components/exercises/ExerciseThumbnail";
import type { LocalExercise } from "@/types/entities";

export function ExerciseListItem({
  exercise,
  onClick,
}: {
  exercise: LocalExercise;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-left"
    >
      <ExerciseThumbnail imageUrl={exercise.image_url} alt={exercise.name_es} />
      <div className="flex flex-col">
        <span className="text-base">{exercise.name_es}</span>
        <span className="text-sm text-neutral-500">{exercise.muscle_group}</span>
      </div>
    </Wrapper>
  );
}
