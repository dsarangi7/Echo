import { REMINDER_STORAGE_KEY, saveReminderSettings } from "../practice/reminder";
import { addShanghaiDays, isShanghaiDayKey, normalizePracticeDays } from "../practice/shanghai";
import { STREAK_CHANGED_EVENT, STREAK_STORAGE_KEY, type StreakRecord } from "../practice/streak";

/** Keys written by the first Android build, before PR #16 landed. */
export const LEGACY_PRACTICE_DAYS_KEY = "echo-practice-days";
export const LEGACY_REMINDER_PREFS_KEY = "echo-reminder-prefs";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Copy an old Android log into the web keys when those keys are still empty.
 * Existing `echo-practice-streak` / `echo-practice-reminder` values win.
 * Returns true when a legacy value was adopted.
 */
export function migrateLegacyPracticeStorage(storage: StorageLike, now = new Date()): boolean {
  let migrated = false;
  if (storage.getItem(STREAK_STORAGE_KEY)) {
    storage.removeItem(LEGACY_PRACTICE_DAYS_KEY);
  } else {
    const days = legacyDays(storage.getItem(LEGACY_PRACTICE_DAYS_KEY));
    if (days.length > 0) {
      storage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakFromDays(days)));
      storage.removeItem(LEGACY_PRACTICE_DAYS_KEY);
      migrated = true;
      notifyStreak(storage);
    }
  }

  if (storage.getItem(REMINDER_STORAGE_KEY)) {
    storage.removeItem(LEGACY_REMINDER_PREFS_KEY);
  } else {
    const prefs = legacyPrefs(storage.getItem(LEGACY_REMINDER_PREFS_KEY));
    if (prefs) {
      const time = `${String(prefs.hour).padStart(2, "0")}:${String(prefs.minute).padStart(2, "0")}`;
      saveReminderSettings(storage, { enabled: prefs.enabled, time }, now);
      storage.removeItem(LEGACY_REMINDER_PREFS_KEY);
      migrated = true;
    }
  }
  return migrated;
}

function streakFromDays(days: readonly string[]): StreakRecord {
  const practiceDays = normalizePracticeDays(days);
  const lastPracticeDay = practiceDays[practiceDays.length - 1] ?? null;
  let current = 0;
  if (lastPracticeDay) {
    const set = new Set(practiceDays);
    let cursor = lastPracticeDay;
    while (set.has(cursor)) {
      current += 1;
      cursor = addShanghaiDays(cursor, -1);
    }
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of practiceDays) {
    run = prev && addShanghaiDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best: Math.max(best, current), lastPracticeDay, practiceDays };
}

function legacyDays(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { days?: unknown }).days)
        ? (parsed as { days: unknown[] }).days
        : [];
    return list.filter((value): value is string => typeof value === "string" && isShanghaiDayKey(value));
  } catch {
    return [];
  }
}

function legacyPrefs(raw: string | null): { enabled: boolean; hour: number; minute: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { enabled?: unknown; hour?: unknown; minute?: unknown; weeklyEnabled?: unknown };
    if (!parsed || typeof parsed !== "object") return null;
    const hour = clamp(parsed.hour, 23, 20);
    const minute = clamp(parsed.minute, 59, 0);
    const enabled = parsed.enabled === true || parsed.weeklyEnabled === true;
    return { enabled, hour, minute };
  } catch {
    return null;
  }
}

function clamp(value: unknown, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(n)));
}

function notifyStreak(storage: StorageLike): void {
  try {
    if (typeof localStorage === "undefined" || storage !== localStorage) return;
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(STREAK_CHANGED_EVENT));
  } catch {
    /* private mode */
  }
}
