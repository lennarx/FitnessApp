"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  applyMealParse,
  deleteMeal,
  skipMealParse,
  updateMealOccurredAt,
  updateMealRawText,
} from "@/lib/db/meals";
import { requestMealParse } from "@/lib/parse/requestMealParse";
import { useOnline } from "@/lib/sync/useOnline";
import type { LocalMeal } from "@/types/entities";

function toTimeInput(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** View/edit a single meal: raw_text (re-triggers parse), occurred_at, "no procesar", "Borrar". */
export function MealDetailModal({ meal, onClose }: { meal: LocalMeal; onClose: () => void }) {
  const [rawText, setRawText] = useState(meal.raw_text);
  const [time, setTime] = useState(toTimeInput(meal.occurred_at));
  const [saving, setSaving] = useState(false);
  const online = useOnline();

  async function handleSaveRawText() {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed === meal.raw_text) return;

    setSaving(true);
    await updateMealRawText(meal.id, trimmed);

    if (online) {
      const result = await requestMealParse(trimmed);
      if (result.ok) {
        await applyMealParse(meal.id, result.parsed);
      }
    }
    setSaving(false);
  }

  async function handleSaveTime() {
    if (time === toTimeInput(meal.occurred_at)) return;
    const occurredDate = new Date(meal.occurred_at);
    const [hours, minutes] = time.split(":").map(Number);
    occurredDate.setHours(hours, minutes, 0, 0);
    await updateMealOccurredAt(meal.id, occurredDate.toISOString());
  }

  async function handleSkipParse() {
    await skipMealParse(meal.id);
    onClose();
  }

  async function handleDelete() {
    await deleteMeal(meal.id);
    onClose();
  }

  return (
    <Modal title="Comida" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-400" htmlFor="meal-detail-raw-text">
          Texto
          <textarea
            id="meal-detail-raw-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onBlur={handleSaveRawText}
            rows={3}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>

        {meal.structured_text && (
          <p className="text-sm text-neutral-500">Procesado: {meal.structured_text}</p>
        )}

        <label className="flex flex-col gap-1 text-sm text-neutral-400" htmlFor="meal-detail-time">
          Hora
          <input
            id="meal-detail-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onBlur={handleSaveTime}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100"
          />
        </label>

        <div className="flex flex-wrap gap-3 text-sm">
          {meal.parse_status === "pending_parse" && (
            <button onClick={handleSkipParse} className="text-neutral-400 underline">
              No procesar
            </button>
          )}
          <button onClick={handleDelete} className="text-red-400 underline">
            Borrar
          </button>
        </div>

        {saving && <p className="text-sm text-neutral-500">Guardando...</p>}
      </div>
    </Modal>
  );
}
