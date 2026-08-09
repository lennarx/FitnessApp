"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardioForm } from "@/components/session/CardioForm";
import { db } from "@/lib/db";
import { getOrCreateTrainingSession } from "@/lib/db/sessions";
import { todayLocalDate } from "@/lib/utils/dates";

export default function SesionPage() {
  const router = useRouter();
  const [showCardioForm, setShowCardioForm] = useState(false);

  const todaySessions = useLiveQuery(
    () => db.training_sessions.where("session_date").equals(todayLocalDate()).toArray(),
    []
  );
  const openSession = todaySessions?.find((s) => s.ended_at === null);

  const activeRoutine = useLiveQuery(async () => {
    const routines = await db.routines.toArray();
    return routines.find((r) => r.is_active && r.deleted_at === null) ?? null;
  }, []);

  const days = useLiveQuery(async () => {
    if (!activeRoutine) return [];
    const all = await db.routine_days.where("routine_id").equals(activeRoutine.id).toArray();
    return all.filter((d) => d.deleted_at === null).sort((a, b) => a.day_order - b.day_order);
  }, [activeRoutine?.id]);

  const openSessionDayLabel = openSession?.routine_day_id
    ? (days?.find((d) => d.id === openSession.routine_day_id)?.day_label ?? "Rutina")
    : "Libre";

  async function handleSelectDay(dayId: string | null) {
    const id = await getOrCreateTrainingSession(dayId);
    if (id) router.push(`/sesion/${id}`);
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-lg font-semibold">Sesión</h1>

      {openSession && (
        <button
          onClick={() => router.push(`/sesion/${openSession.id}`)}
          className="rounded-md border border-emerald-700 bg-emerald-950 p-4 text-left text-base text-emerald-300"
        >
          Retomar sesión de hoy · {openSessionDayLabel}
        </button>
      )}

      <div className="flex flex-col gap-2">
        {activeRoutine === undefined || days === undefined ? (
          <p className="text-neutral-500">Cargando...</p>
        ) : !activeRoutine ? (
          <p className="text-neutral-500">No hay una rutina activa. Creá una en Plan.</p>
        ) : (
          days.map((day) => (
            <button
              key={day.id}
              onClick={() => handleSelectDay(day.id)}
              className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-left text-base"
            >
              {day.day_label}
            </button>
          ))
        )}

        <button
          onClick={() => handleSelectDay(null)}
          className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-left text-base"
        >
          Sesión libre
        </button>
      </div>

      <button
        onClick={() => setShowCardioForm(true)}
        className="rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white"
      >
        Registrar cardio / natación
      </button>

      {showCardioForm && <CardioForm onClose={() => setShowCardioForm(false)} />}
    </main>
  );
}
