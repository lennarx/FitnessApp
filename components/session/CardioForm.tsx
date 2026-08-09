"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { createCardioSession } from "@/lib/db/sessions";

export function CardioForm({ onClose }: { onClose: () => void }) {
  const [activityType, setActivityType] = useState<"swim" | "other">("swim");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [intensityRaw, setIntensityRaw] = useState("");
  const [intensityRpe, setIntensityRpe] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!durationMinutes.trim()) return;
    await createCardioSession({
      activity_type: activityType,
      duration_minutes: Number(durationMinutes),
      distance_meters: distanceMeters.trim() === "" ? null : Number(distanceMeters),
      intensity_raw: intensityRaw.trim() === "" ? null : intensityRaw.trim(),
      intensity_rpe: intensityRpe.trim() === "" ? null : Number(intensityRpe),
      notes: notes.trim() === "" ? null : notes.trim(),
    });
    onClose();
  }

  return (
    <Modal title="Cardio / natación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Tipo
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as "swim" | "other")}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          >
            <option value="swim">Natación</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Duración (minutos)
          <input
            type="number"
            inputMode="numeric"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Metros (opcional)
          <input
            type="number"
            inputMode="numeric"
            value={distanceMeters}
            onChange={(e) => setDistanceMeters(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Intensidad
          <input
            type="text"
            value={intensityRaw}
            onChange={(e) => setIntensityRaw(e.target.value)}
            placeholder="ej: moderada, RPE 6"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          RPE (opcional)
          <input
            type="number"
            inputMode="numeric"
            value={intensityRpe}
            onChange={(e) => setIntensityRpe(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Notas
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100"
          />
        </label>
        <button
          type="submit"
          disabled={!durationMinutes.trim()}
          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </form>
    </Modal>
  );
}
