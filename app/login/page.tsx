"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-base"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium disabled:opacity-50"
        >
          {status === "sending" ? "Enviando..." : "Enviarme el link"}
        </button>
        {status === "sent" && (
          <p className="text-sm text-emerald-400">
            Revisá tu email y hacé click en el link para entrar.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">
            Algo salió mal. Probá de nuevo.
          </p>
        )}
      </form>
    </main>
  );
}
