import { describe, expect, it } from "vitest";
import { speechErrorMessage } from "./speechErrors";

describe("speechErrorMessage", () => {
  it.each([
    ["not-allowed"],
    ["service-not-allowed"],
  ])("explains permission denial for %s", (code) => {
    expect(speechErrorMessage(code)).toMatch(/permiso/i);
  });

  it("has a distinct message for no-speech", () => {
    expect(speechErrorMessage("no-speech")).toBe("No se escuchó nada. Probá de nuevo.");
  });

  it("has a distinct message for audio-capture", () => {
    expect(speechErrorMessage("audio-capture")).toBe("No se encontró un micrófono.");
  });

  it("has a distinct message for network", () => {
    expect(speechErrorMessage("network")).toBe("No se pudo conectar al servicio de dictado.");
  });

  it("returns an empty string for a user-initiated abort", () => {
    expect(speechErrorMessage("aborted")).toBe("");
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(speechErrorMessage("some-unknown-code")).toBe("No se pudo usar el micrófono.");
  });
});
