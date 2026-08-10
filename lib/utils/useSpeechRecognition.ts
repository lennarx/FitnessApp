"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { speechErrorMessage } from "./speechErrors";

/**
 * Minimal Web Speech API surface — no @types/dom-speech-recognition
 * dependency, just the handful of members this hook actually touches.
 */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser support never changes during a session, so there's nothing to
// subscribe to — the empty unsubscribe is enough for useSyncExternalStore to
// report the real value after hydration without a setState-in-effect.
function subscribeNever(): () => void {
  return () => {};
}

function getSupportedSnapshot(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function getSupportedServerSnapshot(): boolean {
  return false;
}

/**
 * Feeds the existing text input rather than submitting anything itself —
 * the user always sees and can edit the transcript before it's parsed.
 * `supported` reports false for the server snapshot so it never disagrees
 * with the server-rendered markup before hydration.
 */
export function useSpeechRecognition(): {
  supported: boolean;
  listening: boolean;
  error: string | null;
  start: (onResult: (transcript: string) => void) => void;
  stop: () => void;
} {
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportedSnapshot,
    getSupportedServerSnapshot
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function start(onResult: (transcript: string) => void) {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;

    setError(null);

    const recognition = new Recognition();
    recognition.lang = "es-AR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onResult(transcript);
    };
    recognition.onerror = (event) => {
      const message = speechErrorMessage(event.error);
      if (message) setError(message);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { supported, listening, error, start, stop };
}
