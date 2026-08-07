"use client";

import { useEffect } from "react";
import { pushPending } from "./syncEngine";

/**
 * Wires the three sync triggers the brief calls for: app mount, the
 * `online` event, and a `sync:requested` event dispatched by write helpers
 * right after a local write (no-op if offline — it just sits until `online`
 * fires). Mount once near the root layout, inside AuthGuard's children so
 * it only runs once a session exists.
 */
export function useSyncTrigger(): void {
  useEffect(() => {
    void pushPending();

    function handlePush() {
      void pushPending();
    }

    window.addEventListener("online", handlePush);
    window.addEventListener("sync:requested", handlePush);

    return () => {
      window.removeEventListener("online", handlePush);
      window.removeEventListener("sync:requested", handlePush);
    };
  }, []);
}
