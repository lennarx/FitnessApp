const WEEKDAYS_ES = ["dom", "lun", "mar", "mié", "jué", "vie", "sáb"];
const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * YYYY-MM-DD in the device's local timezone. toISOString() returns the UTC
 * date, which at 21:00 in Argentina (UTC-3) is already the next day — a
 * late-night session would land on the wrong session_date.
 */
export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "2026-08-09" -> "sáb 9 ago" */
export function formatSessionDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const local = new Date(year, month - 1, day);
  return `${WEEKDAYS_ES[local.getDay()]} ${local.getDate()} ${MONTHS_ES[local.getMonth()]}`;
}
