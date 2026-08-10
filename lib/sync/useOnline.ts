"use client";

import { useSyncExternalStore } from "react";

/**
 * No connectivity signal existed anywhere in the UI before — navigator.onLine
 * was only read inside pushPending(). useSyncExternalStore (not an effect —
 * the project's eslint config flags setState-in-effect) subscribes to the
 * online/offline events directly and reports `true` for the server snapshot,
 * so SSR/hydration never mismatches on the mic button or other online-gated
 * UI. Used to gate the mic button (Chrome's speech recognition needs
 * network) and the parse-vs-inbox / "Procesar" decisions.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
