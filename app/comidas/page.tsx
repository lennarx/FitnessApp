"use client";

import { useState } from "react";
import { DayHeader } from "@/components/meals/DayHeader";
import { MealComposer } from "@/components/meals/MealComposer";
import { MealDetailModal } from "@/components/meals/MealDetailModal";
import { MealListItem } from "@/components/meals/MealListItem";
import { BodyWeightSection } from "@/components/weight/BodyWeightSection";
import { applyMealParse, setDayTrainingFlag } from "@/lib/db/meals";
import { useMealsForDay, usePendingParseMeals } from "@/lib/db/useMeals";
import { requestMealParse } from "@/lib/parse/requestMealParse";
import { useOnline } from "@/lib/sync/useOnline";
import { todayLocalDate } from "@/lib/utils/dates";
import type { LocalMeal } from "@/types/entities";

export default function ComidasPage() {
  const [tab, setTab] = useState<"dia" | "peso">("dia");
  const [date, setDate] = useState(todayLocalDate());
  const [selectedMeal, setSelectedMeal] = useState<LocalMeal | null>(null);
  const [processingPending, setProcessingPending] = useState(false);

  const meals = useMealsForDay(date);
  const pendingMeals = usePendingParseMeals();
  const online = useOnline();

  // training_day_flag lives per-meal in the schema, but the UI treats it as
  // a day-level toggle. Once the day has meals, they're the source of truth
  // (setDayTrainingFlag keeps them all in sync). Before the first meal of
  // the day exists there's nowhere to persist it yet, so it's tracked here
  // and handed to new meals at creation time — same render-time hydration
  // pattern as DailyMetricsPanel/DayHeader's steps field.
  const [localTrainingFlag, setLocalTrainingFlag] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  if (meals !== undefined && hydratedFor !== date) {
    setLocalTrainingFlag(meals.length > 0 ? meals[0].training_day_flag : false);
    setHydratedFor(date);
  }
  const trainingDayFlag = meals && meals.length > 0 ? meals[0].training_day_flag : localTrainingFlag;

  async function handleToggleTrainingDay() {
    const next = !trainingDayFlag;
    setLocalTrainingFlag(next);
    if (meals && meals.length > 0) {
      await setDayTrainingFlag(date, next);
    }
  }

  async function handleProcessPending() {
    if (!pendingMeals || pendingMeals.length === 0) return;
    setProcessingPending(true);
    // Sequential, not Promise.all — a batch of "procesar pendientes" isn't
    // worth hammering the parse endpoint in parallel.
    for (const meal of pendingMeals) {
      const result = await requestMealParse(meal.raw_text);
      if (result.ok) {
        await applyMealParse(meal.id, result.parsed, meal.raw_text);
      }
    }
    setProcessingPending(false);
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Comidas</h1>
        <div className="flex rounded-md border border-neutral-800 text-sm">
          <button
            onClick={() => setTab("dia")}
            className={`rounded-l-md px-3 py-1.5 ${
              tab === "dia" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400"
            }`}
          >
            Día
          </button>
          <button
            onClick={() => setTab("peso")}
            className={`rounded-r-md px-3 py-1.5 ${
              tab === "peso" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400"
            }`}
          >
            Peso
          </button>
        </div>
      </div>

      {tab === "dia" ? (
        <>
          <DayHeader
            date={date}
            onDateChange={setDate}
            trainingDayFlag={trainingDayFlag}
            onToggleTrainingDay={() => void handleToggleTrainingDay()}
          />

          <MealComposer date={date} trainingDayFlag={trainingDayFlag} />

          {pendingMeals !== undefined && pendingMeals.length > 0 && online && (
            <button
              onClick={handleProcessPending}
              disabled={processingPending}
              className="rounded-md border border-amber-700 bg-amber-950 px-4 py-3 text-base text-amber-300 disabled:opacity-50"
            >
              {processingPending
                ? "Procesando..."
                : `Procesar pendientes (${pendingMeals.length})`}
            </button>
          )}

          <div className="flex flex-col gap-2">
            {meals === undefined ? (
              <p className="text-neutral-500">Cargando...</p>
            ) : meals.length === 0 ? (
              <p className="text-neutral-500">
                Sin comidas registradas. Usá el campo de arriba para cargar la primera.
              </p>
            ) : (
              meals.map((meal) => (
                <MealListItem key={meal.id} meal={meal} onClick={() => setSelectedMeal(meal)} />
              ))
            )}
          </div>

          {selectedMeal && (
            <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
          )}
        </>
      ) : (
        <BodyWeightSection />
      )}
    </main>
  );
}
