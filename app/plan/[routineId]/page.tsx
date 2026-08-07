"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@/lib/db";
import { createRoutineDay, deleteRoutine, deleteRoutineDay } from "@/lib/db/routines";

export default function RoutineDaysPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");

  const routine = useLiveQuery(() => db.routines.get(routineId), [routineId]);

  const days = useLiveQuery(async () => {
    const all = await db.routine_days.where("routine_id").equals(routineId).toArray();
    return all
      .filter((d) => d.deleted_at === null)
      .sort((a, b) => a.day_order - b.day_order);
  }, [routineId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const nextOrder = days?.length ?? 0;
    await createRoutineDay({
      routine_id: routineId,
      day_label: newLabel,
      day_order: nextOrder,
    });
    setNewLabel("");
  }

  async function handleDeleteRoutine() {
    if (!confirm(`¿Borrar la rutina "${routine?.name}" y todos sus días?`)) return;
    await deleteRoutine(routineId);
    router.push("/plan");
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{routine?.name ?? "..."}</h1>
        <button onClick={handleDeleteRoutine} className="text-sm text-red-400">
          Borrar rutina
        </button>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Etiqueta del día (ej: Upper 1)"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={!newLabel.trim()}
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {days === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : days.length === 0 ? (
          <p className="text-neutral-500">Todavía no hay días.</p>
        ) : (
          days.map((day) => (
            <div
              key={day.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 p-4"
            >
              <Link href={`/plan/${routineId}/${day.id}`} className="flex-1 text-base">
                {day.day_label}
              </Link>
              <button
                onClick={() => deleteRoutineDay(day.id)}
                className="text-sm text-red-400"
              >
                Borrar
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
