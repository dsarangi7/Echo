import { parseClock } from "./shanghai";

/** YYYY-MM-DD on the device clock. Not the Asia/Shanghai streak day. */
export function deviceDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Minutes after midnight on the device clock, 0–1439. */
export function deviceMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function addLocalDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const local = new Date(year, month - 1, date, 12, 0, 0, 0);
  local.setDate(local.getDate() + delta);
  return deviceDateKey(local);
}

/** Epoch milliseconds for HH:MM on a device-local calendar day. */
export function deviceInstant(day: string, time: string): number {
  const parsed = parseClock(time);
  const [year, month, date] = day.split("-").map(Number);
  if (!parsed) return Number.NaN;
  return new Date(year, month - 1, date, parsed.hour, parsed.minute, 0, 0).getTime();
}

/**
 * Next device-local Monday at HH:MM.
 * A Monday alarm that has not happened yet is today. One that already passed is next week.
 */
export function nextDeviceMonday(now: Date, time: string): Date {
  const parsed = parseClock(time) ?? { hour: 20, minute: 0 };
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  const daysUntilMonday = (1 - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + daysUntilMonday);
  candidate.setHours(parsed.hour, parsed.minute, 0, 0);
  if (candidate.getTime() < now.getTime()) candidate.setDate(candidate.getDate() + 7);
  return candidate;
}
