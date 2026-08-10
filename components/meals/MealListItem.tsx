"use client";

import type { LocalMeal } from "@/types/entities";

function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const CHIP: Record<LocalMeal["parse_status"], { label: string; className: string }> = {
  parsed: { label: "procesada", className: "text-emerald-400" },
  pending_parse: { label: "pendiente", className: "text-amber-400" },
  unparsed: { label: "sin procesar", className: "text-neutral-500" },
};

export function MealListItem({ meal, onClick }: { meal: LocalMeal; onClick: () => void }) {
  const chip = CHIP[meal.parse_status];

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-left"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-500">{formatTime(meal.occurred_at)}</span>
        <span className="text-base text-neutral-100">{meal.structured_text ?? meal.raw_text}</span>
      </div>
      <span className={`shrink-0 text-xs ${chip.className}`}>{chip.label}</span>
    </button>
  );
}
