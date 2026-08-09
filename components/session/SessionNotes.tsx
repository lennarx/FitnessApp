"use client";

import { useState } from "react";
import { updateTrainingSession } from "@/lib/db/sessions";

export function SessionNotes({
  sessionId,
  initialNotes,
  editable,
}: {
  sessionId: string;
  initialNotes: string | null;
  editable: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");

  async function handleBlur() {
    await updateTrainingSession(sessionId, {
      notes: notes.trim() === "" ? null : notes.trim(),
    });
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-neutral-400">
      Notas de la sesión
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        disabled={!editable}
        rows={3}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-neutral-100 disabled:opacity-50"
      />
    </label>
  );
}
