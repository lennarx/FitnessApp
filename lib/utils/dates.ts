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

/** "2026-08-09" + 1 -> "2026-08-10" (or -1 -> "2026-08-08"). Local calendar
 * arithmetic via the Date constructor's day-overflow rollover, not UTC math,
 * so it can't skip or repeat a day across a DST boundary. */
export function addLocalDays(date: string, n: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const local = new Date(year, month - 1, day + n);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Local calendar day "2026-08-09" -> the [start, end) ISO instant range that
 * covers it, in UTC (the format `occurred_at` is always stored in). Lets a
 * Dexie query on the `occurred_at` index use `.between(startIso, endIso)`
 * instead of loading every meal and filtering in JS.
 */
export function localDayRangeIso(date: string): { startIso: string; endIso: string } {
  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * UTC ISO instant -> local calendar date + time, e.g. for occurred_at columns
 * in the Excel export. Uses Date's local getters (not toISOString/slice),
 * same reasoning as todayLocalDate: the UTC date can be a day off from the
 * local one.
 */
export function isoToLocalDateTime(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return { fecha: `${year}-${month}-${day}`, hora: `${hours}:${minutes}` };
}

/**
 * Parses an `<input type="time">` value ("HH:MM") into numeric parts, or
 * null when it's empty or malformed — e.g. the user clears the field right
 * before submitting. Returning null (rather than NaN) lets callers pick
 * their own fallback instead of building an Invalid Date whose
 * toISOString() throws and crashes the submit flow.
 */
export function parseTimeInput(time: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}
