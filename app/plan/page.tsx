"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { db } from "@/lib/db";
import { createRoutine } from "@/lib/db/routines";

export default function PlanPage() {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const routines = useLiveQuery(async () => {
    const all = await db.routines.toArray();
    return all
      .filter((r) => r.deleted_at === null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await createRoutine(newName);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-lg font-semibold">Plan</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          ref={nameInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la rutina (ej: Upper/Lower 2.0)"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={!newName.trim() || creating}
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          {creating ? "Creando..." : "Crear"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {routines === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : routines.length === 0 ? (
          <EmptyState
            message="Todavía no hay rutinas."
            cta={{ label: "Crear la primera", onClick: () => nameInputRef.current?.focus() }}
          />
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
