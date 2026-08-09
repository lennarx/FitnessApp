"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { createCustomExercise } from "@/lib/db/exercises";
import { MUSCLE_GROUPS } from "@/types/entities";

export function NewExerciseForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCustomExercise({ name_es: name, muscle_group: muscleGroup });
    onClose();
  }

  return (
    <Modal title="Nuevo ejercicio" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del ejercicio"
          autoFocus
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
        >
          {MUSCLE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
    </Modal>
  );
}
