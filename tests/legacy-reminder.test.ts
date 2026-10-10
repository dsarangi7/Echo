import { describe, expect, it } from "vitest";
import {
  LEGACY_PRACTICE_DAYS_KEY,
  LEGACY_REMINDER_PREFS_KEY,
  migrateLegacyPracticeStorage,
} from "../src/native/legacyReminder";
import { REMINDER_STORAGE_KEY } from "../src/practice/reminder";
import { STREAK_STORAGE_KEY } from "../src/practice/streak";

function memoryStorage(initial?: Record<string, string>): Storage {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

const WEDNESDAY = new Date("2026-10-07T04:00:00.000Z");

describe("legacy Android keys", () => {
  it("copies an old day list into echo-practice-streak and drops the old key", () => {
    const storage = memoryStorage({
      [LEGACY_PRACTICE_DAYS_KEY]: JSON.stringify({ v: 1, days: ["2026-10-05", "2026-10-06", "2026-10-07"] }),
    });
    expect(migrateLegacyPracticeStorage(storage, WEDNESDAY)).toBe(true);
    expect(storage.getItem(LEGACY_PRACTICE_DAYS_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(STREAK_STORAGE_KEY) ?? "{}")).toMatchObject({
      current: 3,
      best: 3,
      lastPracticeDay: "2026-10-07",
      practiceDays: ["2026-10-05", "2026-10-06", "2026-10-07"],
    });
  });

  it("copies an old reminder into echo-practice-reminder", () => {
    const storage = memoryStorage({
      [LEGACY_REMINDER_PREFS_KEY]: JSON.stringify({ enabled: true, hour: 8, minute: 15, weeklyEnabled: true }),
    });
    expect(migrateLegacyPracticeStorage(storage, WEDNESDAY)).toBe(true);
    expect(storage.getItem(LEGACY_REMINDER_PREFS_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(REMINDER_STORAGE_KEY) ?? "{}")).toMatchObject({
      enabled: true,
      time: "08:15",
    });
  });

  it("leaves a web streak in place when both keys exist", () => {
    const web = JSON.stringify({
      current: 2,
      best: 4,
      lastPracticeDay: "2026-10-07",
      practiceDays: ["2026-10-06", "2026-10-07"],
    });
    const storage = memoryStorage({
      [STREAK_STORAGE_KEY]: web,
      [LEGACY_PRACTICE_DAYS_KEY]: JSON.stringify({ days: ["2026-10-01"] }),
      [REMINDER_STORAGE_KEY]: JSON.stringify({
        enabled: true,
        time: "21:00",
        lastDailyDay: null,
        lastWeeklyWeekStart: "2026-09-28",
      }),
      [LEGACY_REMINDER_PREFS_KEY]: JSON.stringify({ enabled: false, hour: 7, minute: 0 }),
    });
    expect(migrateLegacyPracticeStorage(storage, WEDNESDAY)).toBe(false);
    expect(storage.getItem(STREAK_STORAGE_KEY)).toBe(web);
    expect(storage.getItem(LEGACY_PRACTICE_DAYS_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(REMINDER_STORAGE_KEY) ?? "{}").time).toBe("21:00");
    expect(storage.getItem(LEGACY_REMINDER_PREFS_KEY)).toBeNull();
  });
});
