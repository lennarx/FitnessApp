"use client";

import { discardNlInboxEntry } from "@/lib/db/nlInbox";
import { usePendingNlInbox } from "@/lib/db/useNlInbox";
import type { LocalNlInbox } from "@/types/entities";

/**
 * Pending nl_inbox entries for this device's user — sets kind only, since
 * there's no meals screen yet (Fase 5). No background processing: every
 * item waits for an explicit tap on "Procesar".
 */
export function NlInboxList({
  online,
  onProcess,
}: {
  online: boolean;
  onProcess: (entry: LocalNlInbox) => void;
}) {
  const pending = usePendingNlInbox("sets");

  if (!pending || pending.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <span className="text-sm text-amber-400">
        {pending.length} sin procesar
      </span>
      <div className="flex flex-col gap-2">
        {pending.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-sm text-neutral-200">{entry.raw_text}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onProcess(entry)}
                disabled={!online}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Procesar
              </button>
              {!online && <span className="text-sm text-neutral-500">sin señal</span>}
              <button
                onClick={() => discardNlInboxEntry(entry.id)}
                className="text-sm text-red-400"
              >
                Descartar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
