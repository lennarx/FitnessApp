/**
 * Web Speech API error codes -> rioplatense messages. "aborted" is the
 * user cancelling their own dictation (tapping the mic again, navigating
 * away) — not a failure, so it gets no message.
 */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Denegaste el permiso del micrófono. Habilitalo en los ajustes del navegador para poder dictar.";
    case "no-speech":
      return "No se escuchó nada. Probá de nuevo.";
    case "audio-capture":
      return "No se encontró un micrófono.";
    case "network":
      return "No se pudo conectar al servicio de dictado.";
    case "aborted":
      return "";
    default:
      return "No se pudo usar el micrófono.";
  }
}
