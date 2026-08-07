"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { db } from "@/lib/db";
import { createRoutine } from "@/lib/db/routines";

export default function PlanPage() {
  const [newName, setNewName] = useState("");

  const routines = useLiveQuery(async () => {
    const all = await db.routines.toArray();
    return all
      .filter((r) => r.deleted_at === null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createRoutine(newName);
    setNewName("");
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-lg font-semibold">Plan</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la rutina (ej: Upper/Lower 2.0)"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          Crear
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {routines === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : routines.length === 0 ? (
          <p className="text-neutral-500">Todavía no hay rutinas.</p>
        ) : (
          routines.map((routine) => (
            <Link
              key={routine.id}
              href={`/plan/${routine.id}`}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 p-4"
            >
              <span className="text-base">{routine.name}</span>
              <span className="text-neutral-500">›</span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
