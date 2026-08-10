"use client";

import { useState } from "react";
import { createBodyWeight, deleteBodyWeight, updateBodyWeight } from "@/lib/db/bodyWeight";
import { useBodyWeightLog } from "@/lib/db/useBodyWeight";
import { formatSessionDate } from "@/lib/utils/dates";
import { parseBodyWeightKg } from "@/lib/utils/parseWeight";
import type { LocalBodyWeight } from "@/types/entities";

function deltaLabel(delta: number): { arrow: string; className: string } {
  if (delta > 0) return { arrow: "↑", className: "text-red-400" };
  if (delta < 0) return { arrow: "↓", className: "text-emerald-400" };
  return { arrow: "=", className: "text-neutral-500" };
}

export function BodyWeightSection() {
  const log = useBodyWeightLog();
  const [weightInput, setWeightInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseBodyWeightKg(weightInput);
    if (parsed === null) {
      setError("Ingresá un peso válido en kg.");
      return;
    }
    setError(null);
    await createBodyWeight({ weight_kg: parsed, notes: notes.trim() === "" ? null : notes.trim() });
    setWeightInput("");
    setNotes("");
  }

  function startEdit(entry: LocalBodyWeight) {
    setEditingId(entry.id);
    setEditWeight(entry.weight_kg.toString());
  }

  async function handleSaveEdit(id: string) {
    const parsed = parseBodyWeightKg(editWeight);
    if (parsed !== null) {
      await updateBodyWeight(id, { weight_kg: parsed });
    }
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3"
      >
        <label className="text-sm text-neutral-400" htmlFor="body-weight-input">
          Peso (kg)
        </label>
        <input
          id="body-weight-input"
          type="text"
          inputMode="decimal"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          placeholder="82,5"
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!weightInput.trim()}
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          Registrar
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {log === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : log.length === 0 ? (
          <p className="text-neutral-500">Sin mediciones registradas.</p>
        ) : (
          log.map(({ entry, delta_kg }) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-neutral-500">{formatSessionDate(entry.measured_at)}</span>
                {editingId === entry.id ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    onBlur={() => handleSaveEdit(entry.id)}
                    autoFocus
                    className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-base text-neutral-100"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(entry)}
                    className="w-fit text-left text-base text-neutral-100"
                  >
                    {entry.weight_kg} kg
                  </button>
                )}
                {entry.notes && <span className="text-xs text-neutral-500">{entry.notes}</span>}
              </div>
              <div className="flex items-center gap-3">
                {delta_kg !== null &&
                  (() => {
                    const { arrow, className } = deltaLabel(delta_kg);
                    return (
                      <span className={`text-sm ${className}`}>
                        {arrow} {Math.abs(delta_kg)} kg
                      </span>
                    );
                  })()}
                <button onClick={() => deleteBodyWeight(entry.id)} className="text-sm text-red-400">
                  Borrar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
