"use client";

import { useState } from "react";
import { NlTextInput } from "@/components/nl/NlTextInput";
import { applyMealParse, createMeal } from "@/lib/db/meals";
import { requestMealParse } from "@/lib/parse/requestMealParse";
import { useOnline } from "@/lib/sync/useOnline";

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * The meal composer's flow is the opposite of NlQuickLog's: it saves first
 * (raw_text, parse_status "pending_parse") and enriches after, instead of
 * confirming a draft before anything is written. So the parse call below is
 * fire-and-forget once the meal already exists — a failure just leaves the
 * row pending, never blocks the input or loses the entry, and the user can
 * register the next meal immediately without waiting on it.
 */
export function MealComposer({
  date,
  trainingDayFlag,
}: {
  date: string;
  trainingDayFlag: boolean;
}) {
  const [text, setText] = useState("");
  const [time, setTime] = useState(nowHHMM());
  const [saving, setSaving] = useState(false);
  const online = useOnline();

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSaving(true);

    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const occurredAt = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();

    const id = await createMeal({
      raw_text: trimmed,
      occurred_at: occurredAt,
      training_day_flag: trainingDayFlag,
    });

    setText("");
    setTime(nowHHMM());
    setSaving(false);

    if (id && online) {
      void (async () => {
        const result = await requestMealParse(trimmed);
        if (result.ok) {
          await applyMealParse(id, result.parsed);
        }
      })();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <NlTextInput
        id="meal-composer-input"
        label="Registrar comida"
        value={text}
        onChange={setText}
        onSubmit={() => void handleSubmit()}
        placeholder="3 huevos revueltos con pan integral"
        submitLabel="Registrar"
        busy={saving}
      />
      <label className="flex items-center gap-2 self-end text-sm text-neutral-400">
        Hora
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-base text-neutral-100"
        />
      </label>
    </div>
  );
}
