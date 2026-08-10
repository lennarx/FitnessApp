"use client";

import { useRouter } from "next/navigation";
import { ExportButton } from "@/components/export/ExportButton";
import { createClient } from "@/lib/supabase/client";

export default function AjustesPage() {
  const router = useRouter();

  async function handleSignOut() {
    if (!confirm("¿Salir de la cuenta?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="flex flex-col gap-6 p-4 pb-8">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      <section className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-base font-medium">Exportar a Excel</h2>
        <ExportButton />
      </section>

      <section className="flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-base font-medium">Versión</h2>
        <p className="text-sm text-neutral-400">
          {process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
        </p>
      </section>

      <button
        onClick={handleSignOut}
        className="rounded-md border border-neutral-700 px-4 py-3 text-base text-red-400"
      >
        Salir de la cuenta
      </button>
    </main>
  );
}
