"use client";

import { useOnline } from "@/lib/sync/useOnline";
import { useSpeechRecognition } from "@/lib/utils/useSpeechRecognition";

/**
 * The visual "campo de texto + mic + submit" shell shared by every
 * lenguaje-natural entry point (sets in NlQuickLog, meals in MealComposer).
 * Purely presentational: it owns the mic button and its dictation wiring,
 * but not what happens on submit — that varies (sets go through a
 * confirm-before-save draft, meals save immediately) so it stays with each
 * caller's own state machine.
 */
export function NlTextInput({
  id,
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  busy = false,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitLabel: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  const online = useOnline();
  const speech = useSpeechRecognition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  function handleMicClick() {
    if (speech.listening) {
      speech.stop();
      return;
    }
    speech.start((transcript) => onChange(transcript));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3"
    >
      <label className="text-sm text-neutral-400" htmlFor={id}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50"
        />
        {speech.supported && online && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={speech.listening ? "Detener dictado" : "Dictar por voz"}
            className={`rounded-md border px-3 py-2 text-base ${
              speech.listening
                ? "border-emerald-600 text-emerald-400"
                : "border-neutral-700 text-neutral-100"
            }`}
          >
            🎤
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!value.trim() || busy || disabled}
        className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {busy ? "Procesando..." : submitLabel}
      </button>
    </form>
  );
}
