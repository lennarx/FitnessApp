"use client";

import { useState } from "react";
import { buildWorkbookData } from "@/lib/export/buildWorkbookData";
import { readExportSnapshot } from "@/lib/export/readExportSnapshot";
import { writeWorkbook } from "@/lib/export/writeWorkbook";
import { todayLocalDate } from "@/lib/utils/dates";

export function ExportButton() {
  const [status, setStatus] = useState<"idle" | "exportando" | "error">("idle");

  async function handleExport() {
    setStatus("exportando");
    try {
      const snapshot = await readExportSnapshot();
      const data = buildWorkbookData(snapshot);
      await writeWorkbook(data, `fitness-export-${todayLocalDate()}.xlsx`);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExport}
        disabled={status === "exportando"}
        className="w-full rounded-md bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {status === "exportando" ? "Exportando..." : "Exportar a Excel"}
      </button>
      <p className="text-sm text-neutral-400">
        Genera un .xlsx con todo tu historial. Funciona sin conexión.
      </p>
      {status === "error" && (
        <p className="text-sm text-red-400">No se pudo generar el archivo. Probá de nuevo.</p>
      )}
    </div>
  );
}
