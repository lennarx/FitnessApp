"use client";

import { useState } from "react";

/**
 * Values arrive prefilled from the last session as editable `value`s, not
 * placeholders — the whole point is that submitting with the prefilled
 * values as-is takes no more than the tap on "Registrar serie". Parent
 * remounts this (via a changing `key`) after each save so the next draft
 * picks up the fresh prefill instead of carrying over what was just typed.
 */
export function SetDraftRow({
  initialLoadRaw,
  initialReps,
  onSubmit,
}: {
  initialLoadRaw: string;
  initialReps: string;
  onSubmit: (input: { load_raw: string; reps: number; rir: number | null }) => Promise<void>;
}) {
  const [loadRaw, setLoadRaw] = useState(initialLoadRaw);
  const [reps, setReps] = useState(initialReps);
  const [rir, setRir] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loadRaw.trim() || !reps.trim()) return;
    await onSubmit({
      load_raw: loadRaw,
      reps: Number(reps),
      rir: rir === "" ? null : Number(rir),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3"
    >
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
          Carga
          <input
            type="text"
            inputMode="decimal"
            value={loadRaw}
            onChange={(e) => setLoadRaw(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-400">
          Reps
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>
        <label className="flex w-16 flex-col gap-1 text-sm text-neutral-400">
          RIR
          <input
            type="number"
            inputMode="numeric"
            value={rir}
            onChange={(e) => setRir(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!loadRaw.trim() || !reps.trim()}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        Registrar serie
      </button>
    </form>
  );
}
