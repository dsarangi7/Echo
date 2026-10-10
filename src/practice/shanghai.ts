/** Calendar math for Asia/Shanghai. China has no daylight-saving time; the offset is UTC+8. */

export const SHANGHAI_TZ = "Asia/Shanghai";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const dateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: SHANGHAI_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: SHANGHAI_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** YYYY-MM-DD in Asia/Shanghai. */
export function shanghaiDateKey(now: Date): string {
  const parts = dateParts.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** Minutes after midnight in Asia/Shanghai, 0–1439. */
export function shanghaiMinutes(now: Date): number {
  const parts = clockParts.formatToParts(now);
  let hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour === 24) hour = 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

export function isShanghaiDayKey(value: string): boolean {
  return DAY.test(value);
}

/** Move a Shanghai calendar day by `delta` days. */
export function addShanghaiDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  // 04:00 UTC is noon in Shanghai, so the calendar day does not flip on the way.
  const instant = Date.UTC(year, month - 1, date, 4, 0, 0) + delta * 86_400_000;
  return shanghaiDateKey(new Date(instant));
}

/**
 * Epoch milliseconds for HH:MM on a Shanghai calendar day.
 * `time` is 24-hour "HH:MM" or "H:MM".
 */
export function shanghaiInstant(day: string, time: string): number {
  const parsed = parseClock(time);
  const [year, month, date] = day.split("-").map(Number);
  if (!parsed || !isShanghaiDayKey(day)) return Number.NaN;
  return Date.UTC(year, month - 1, date, parsed.hour - 8, parsed.minute, 0, 0);
}

/** 0 = Monday … 6 = Sunday. 2024-01-01 was a Monday. */
export function daysFromMonday(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  const diff = Math.round((Date.UTC(year, month - 1, date) - Date.UTC(2024, 0, 1)) / 86_400_000);
  return ((diff % 7) + 7) % 7;
}

/** Monday YYYY-MM-DD of the Shanghai week that contains `now`. */
export function shanghaiWeekStart(now: Date): string {
  const today = shanghaiDateKey(now);
  return addShanghaiDays(today, -daysFromMonday(today));
}

export function parseClock(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Normalize a clock time to HH:MM, or null when it is not a real time. */
export function parseReminderTime(value: string): string | null {
  const clock = parseClock(value);
  if (!clock) return null;
  return `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
}

export function reminderMinutes(time: string): number | null {
  const clock = parseClock(time);
  if (!clock) return null;
  return clock.hour * 60 + clock.minute;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePracticeDays(days: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const day of days) {
    if (DAY_KEY.test(day)) unique.add(day);
  }
  return [...unique].sort().slice(-400);
}

export function laterDay(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function countDaysInRange(days: readonly string[], start: string, end: string): number {
  let count = 0;
  for (const day of days) {
    if (day >= start && day <= end) count += 1;
  }
  return count;
}
