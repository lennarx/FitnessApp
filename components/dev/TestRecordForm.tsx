"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { newId } from "@/lib/utils/ids";
import { getLocalUserId } from "@/lib/auth/session";
import { requestSync } from "@/lib/sync/syncEngine";

/**
 * Demonstrates the full Phase 1 loop: write locally first (synced: false),
 * signal the sync engine, and reactively show local state via liveQuery.
 * Phase 1 scaffolding only — remove once real feature screens land.
 */
export function TestRecordForm() {
  const [note, setNote] = useState("");
  const records = useLiveQuery(
    () => db.test_records.orderBy("created_at").reverse().toArray(),
    [],
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;

    const userId = await getLocalUserId();
    if (!userId) return;

    await db.test_records.add({
      id: newId(),
      user_id: userId,
      created_at: new Date().toISOString(),
      note: note.trim(),
      synced: 0,
    });

    setNote("");
    requestSync();
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota de prueba"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium"
        >
          Guardar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {records?.map((record) => (
          <li
            key={record.id}
            className="flex items-center justify-between rounded-md border border-neutral-800 px-4 py-2 text-sm"
          >
            <span>{record.note}</span>
            <span
              className={record.synced ? "text-emerald-400" : "text-amber-400"}
            >
              {record.synced ? "sincronizado" : "no sincronizado"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
