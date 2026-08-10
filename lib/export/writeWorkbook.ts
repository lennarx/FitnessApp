import type { WorkbookData } from "./buildWorkbookData";

/**
 * Loaded dynamically so xlsx (only needed at export time) doesn't bloat the
 * app's initial bundle. The resulting chunk still needs to be precached by
 * the service worker for export to work offline — see next.config.ts.
 */
export async function writeWorkbook(data: WorkbookData, filename: string): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const { name, headers, rows } of data.sheets) {
    const worksheet =
      rows.length > 0 ? XLSX.utils.json_to_sheet(rows, { header: headers }) : XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }

  XLSX.writeFile(workbook, filename);
}
