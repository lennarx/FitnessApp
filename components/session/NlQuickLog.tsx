"use client";

import { useState } from "react";
import { NlTextInput } from "@/components/nl/NlTextInput";
import { NlInboxList } from "@/components/session/NlInboxList";
import { NlSetsDraft } from "@/components/session/NlSetsDraft";
import { createNlInboxEntry, markNlInboxProcessed } from "@/lib/db/nlInbox";
import { useOnline } from "@/lib/sync/useOnline";
import type { ParsedSets } from "@/lib/parse/validateParseResult";
import type { LocalNlInbox } from "@/types/entities";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "info"; message: string }
  | {
      kind: "malformed";
      message: string;
      rawText: string;
      sourceInboxId: string | null;
    }
  | { kind: "auth_error" };

/**
 * The one-field "Registrar por texto" flow — the app's differentiator.
 * Owns the whole request/fallback state machine; NlSetsDraft only handles
 * the confirm-before-save UI once a parse result exists.
 */
export function NlQuickLog({ sessionId }: { sessionId: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [draft, setDraft] = useState<{ parsed: ParsedSets; sourceInboxId: string | null } | null>(
    null
  );
  const online = useOnline();

  async function attemptParse(rawText: string, sourceInboxId: string | null) {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    setStatus({ kind: "loading" });

    if (!online) {
      // Reprocessing an inbox item while still offline: it's already
      // pending, no need to write a second row.
      if (!sourceInboxId) {
        await createNlInboxEntry({ kind: "sets", raw_text: trimmed });
        setText("");
      }
      setStatus({ kind: "info", message: "Guardado para procesar después — sin señal." });
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "sets", text: trimmed }),
      });
    } catch {
      if (!sourceInboxId) {
        await createNlInboxEntry({ kind: "sets", raw_text: trimmed });
        setText("");
      }
      setStatus({ kind: "info", message: "Guardado para procesar después — no se pudo conectar." });
      return;
    }

    if (res.status === 401) {
      setStatus({ kind: "auth_error" });
      return;
    }

    if (res.status === 502 || res.status === 504) {
      if (!sourceInboxId) {
        await createNlInboxEntry({ kind: "sets", raw_text: trimmed });
        setText("");
      }
      setStatus({ kind: "info", message: "Guardado para procesar después — el servicio de parse no respondió." });
      return;
    }

    if (res.status === 422) {
      const body = await res.json().catch(() => ({ error: "respuesta inesperada" }));
      setStatus({
        kind: "malformed",
        message: body.error ?? "No se pudo interpretar el texto.",
        rawText: trimmed,
        sourceInboxId,
      });
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "error inesperado" }));
      setStatus({ kind: "malformed", message: body.error ?? "Error inesperado.", rawText: trimmed, sourceInboxId });
      return;
    }

    const parsed = (await res.json()) as ParsedSets;
    setDraft({ parsed, sourceInboxId });
    setStatus({ kind: "idle" });
  }

  function handleProcessInboxEntry(entry: LocalNlInbox) {
    void attemptParse(entry.raw_text, entry.id);
  }

  async function handleDraftConfirmed() {
    if (draft?.sourceInboxId) {
      await markNlInboxProcessed(draft.sourceInboxId);
    }
    setDraft(null);
    setText("");
    setStatus({ kind: "idle" });
  }

  async function handleSaveForLater() {
    if (status.kind !== "malformed") return;
    if (!status.sourceInboxId) {
      await createNlInboxEntry({ kind: "sets", raw_text: status.rawText });
    }
    setText("");
    setStatus({ kind: "info", message: "Guardado para procesar después." });
  }

  function handleLoadManual() {
    setText("");
    setStatus({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-3">
      <NlTextInput
        id="nl-quick-log-input"
        label="Registrar por texto"
        value={text}
        onChange={setText}
        onSubmit={() => void attemptParse(text, null)}
        placeholder="prensa 190, 12-11-10, RIR 1"
        submitLabel="Registrar"
        busy={status.kind === "loading"}
      />

      {status.kind === "info" && <p className="text-sm text-neutral-400">{status.message}</p>}
      {status.kind === "auth_error" && (
        <p className="text-sm text-red-400">Sesión vencida, volvé a entrar.</p>
      )}
      {status.kind === "malformed" && (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
          <p className="text-sm text-red-400">{status.message}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              onClick={() => attemptParse(status.rawText, status.sourceInboxId)}
              className="text-emerald-400 underline"
            >
              Reintentar
            </button>
            <button onClick={handleSaveForLater} className="text-neutral-400 underline">
              Guardar para después
            </button>
            <button onClick={handleLoadManual} className="text-neutral-400 underline">
              Cargar manual
            </button>
          </div>
        </div>
      )}

      <NlInboxList online={online} onProcess={handleProcessInboxEntry} />

      {draft && (
        <NlSetsDraft
          sessionId={sessionId}
          exerciseQuery={draft.parsed.exercise_query}
          initialSets={draft.parsed.sets}
          onCancel={() => setDraft(null)}
          onConfirmed={() => void handleDraftConfirmed()}
        />
      )}
    </div>
  );
}
