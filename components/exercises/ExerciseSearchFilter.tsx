"use client";

import { MUSCLE_GROUPS } from "@/types/entities";

export function ExerciseSearchFilter({
  search,
  onSearchChange,
  muscleGroup,
  onMuscleGroupChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  muscleGroup: string;
  onMuscleGroupChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        inputMode="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar ejercicio..."
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500"
      />
      <select
        value={muscleGroup}
        onChange={(e) => onMuscleGroupChange(e.target.value)}
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
      >
        <option value="">Todos los grupos musculares</option>
        {MUSCLE_GROUPS.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
    </div>
  );
}
