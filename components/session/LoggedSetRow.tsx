"use client";

import { useState } from "react";
import { deleteLoggedSet, updateLoggedSet } from "@/lib/db/sessions";
import type { LocalLoggedSet } from "@/types/entities";

export function LoggedSetRow({
  set,
  editable,
}: {
  set: LocalLoggedSet;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [loadRaw, setLoadRaw] = useState(set.load_raw);
  const [reps, setReps] = useState(String(set.reps));
  const [rir, setRir] = useState(set.rir?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateLoggedSet(set.id, {
        load_raw: loadRaw,
        reps: Number(reps),
        rir: rir === "" ? null : Number(rir),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting || !confirm("¿Borrar esta serie?")) return;
    setDeleting(true);
    try {
      await deleteLoggedSet(set.id);
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3"
      >
        <input
          type="text"
          inputMode="decimal"
          value={loadRaw}
          onChange={(e) => setLoadRaw(e.target.value)}
          className="w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-2 text-base text-neutral-100"
        />
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-16 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-2 text-base text-neutral-100"
        />
        <input
          type="number"
          inputMode="numeric"
          value={rir}
          onChange={(e) => setRir(e.target.value)}
          placeholder="RIR"
          className="w-16 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-2 text-base text-neutral-100 placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    );
  }

  const rirLabel = set.rir !== null ? ` @ RIR ${set.rir}` : "";

  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <span className="text-base">
        {set.load_raw} × {set.reps}
        {rirLabel}
      </span>
      {editable && (
        <div className="flex gap-1">
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 text-neutral-400"
            aria-label="Editar"
          >
            ✎
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 text-sm text-red-400 disabled:opacity-50"
            aria-label="Borrar"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
