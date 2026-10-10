import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_TIME,
  REMINDER_CAPABILITIES,
  REMINDER_STORAGE_KEY,
  REMINDER_SYNC_TAG,
  commitDelivery,
  dailyNudgeCopy,
  dueNotices,
  loadReminder,
  nextReminderCheck,
  planBackgroundDelivery,
  saveReminderSettings,
  snapshotFromRecord,
  weeklyNudgeCopy,
  type SyncSnapshot,
} from "../src/practice/reminder";
import { shanghaiInstant } from "../src/practice/shanghai";
import { STREAK_STORAGE_KEY, recordPracticeClearOrPartial } from "../src/practice/streak";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
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
      map.set(key, String(value));
    },
  };
}

function at(day: string, time = "12:00"): Date {
  return new Date(shanghaiInstant(day, time));
}

describe("daily reminder", () => {
  it("stores a Shanghai clock time and does not backfill when it is turned on", () => {
    const storage = memoryStorage();
    expect(loadReminder(storage).time).toBe(DEFAULT_REMINDER_TIME);
    expect(loadReminder(storage).enabled).toBe(false);

    const late = saveReminderSettings(storage, { enabled: true, time: "8:05" }, at("2026-10-07", "21:00"));
    expect(late).toMatchObject({
      enabled: true,
      time: "08:05",
      lastDailyDay: "2026-10-07",
      lastWeeklyWeekStart: "2026-09-28",
    });
    expect(dueNotices(late, [], at("2026-10-07", "21:30"))).toEqual([]);

    const waiting = saveReminderSettings(storage, { enabled: false, time: "20:00" }, at("2026-10-07", "21:00"));
    expect(waiting.enabled).toBe(false);
    expect(waiting.time).toBe("20:00");
    const armed = saveReminderSettings(storage, { enabled: true, time: "20:00" }, at("2026-10-08", "09:00"));
    expect(armed.lastDailyDay).toBe("2026-10-07");
    expect(dueNotices(armed, [], at("2026-10-08", "19:59"))).toEqual([]);
    const due = dueNotices(armed, [], at("2026-10-08", "20:00"));
    expect(due.map((notice) => notice.kind)).toEqual(["daily"]);
    expect(due[0]).toMatchObject(dailyNudgeCopy());
    expect(dailyNudgeCopy().body).not.toMatch(/%/);
  });

  it("skips the daily nudge after a Clear or Partial that same Shanghai day", () => {
    const storage = memoryStorage();
    saveReminderSettings(storage, { enabled: true, time: "20:00" }, at("2026-10-08", "09:00"));
    recordPracticeClearOrPartial(storage, at("2026-10-08", "18:00"));
    const state = loadReminder(storage);
    const days = JSON.parse(storage.getItem(STREAK_STORAGE_KEY) ?? "{}").practiceDays as string[];
    expect(dueNotices(state, days, at("2026-10-08", "20:30"))).toEqual([]);
  });

  it("rejects a clock time that is not a real minute", () => {
    const storage = memoryStorage();
    saveReminderSettings(storage, { enabled: true, time: "20:00" }, at("2026-10-08", "09:00"));
    const kept = saveReminderSettings(storage, { enabled: true, time: "24:00" }, at("2026-10-08", "10:00"));
    expect(kept.time).toBe("20:00");
    expect(JSON.parse(storage.getItem(REMINDER_STORAGE_KEY) ?? "{}").time).toBe("20:00");
  });
});

describe("weekly nudge", () => {
  it("summarizes the completed Shanghai week once, in both languages", () => {
    const storage = memoryStorage();
    saveReminderSettings(storage, { enabled: true, time: "20:00" }, at("2026-10-07", "09:00"));
    recordPracticeClearOrPartial(storage, at("2026-10-05"));
    recordPracticeClearOrPartial(storage, at("2026-10-07"));
    recordPracticeClearOrPartial(storage, at("2026-10-11"));
    const state = loadReminder(storage);
    const days = JSON.parse(storage.getItem(STREAK_STORAGE_KEY) ?? "{}").practiceDays as string[];

    expect(dueNotices(state, days, at("2026-10-11", "21:00")).some((notice) => notice.kind === "weekly")).toBe(false);

    const notices = dueNotices(state, days, at("2026-10-12", "00:05"));
    const weekly = notices.find((notice) => notice.kind === "weekly");
    expect(weekly).toMatchObject({
      kind: "weekly",
      weekStart: "2026-10-05",
      days: 3,
      ...weeklyNudgeCopy(3),
    });
    expect(weeklyNudgeCopy(3).body).toBe(
      "You practiced 3 days this week — keep the streak. 这周你练了 3 天——保持连续打卡。",
    );
    expect(weeklyNudgeCopy(1).body).toContain("1 day");
    expect(weeklyNudgeCopy(3).body).not.toMatch(/%/);

    const planned = planBackgroundDelivery(snapshotFromRecord(state, { practiceDays: days, lastPracticeDay: "2026-10-11" }), at("2026-10-12", "00:05"));
    expect(planned.snapshot.reminder.lastWeeklyWeekStart).toBe("2026-10-05");
    expect(dueNotices(planned.snapshot.reminder, days, at("2026-10-13", "12:00")).some((notice) => notice.kind === "weekly")).toBe(
      false,
    );
  });

  it("does not let the worker overwrite a reminder the page turned off", () => {
    const planned: SyncSnapshot = snapshotFromRecord(
      { enabled: true, time: "20:00", lastDailyDay: "2026-10-12", lastWeeklyWeekStart: "2026-10-05" },
      { practiceDays: ["2026-10-11"], lastPracticeDay: "2026-10-11" },
    );
    const fresh: SyncSnapshot = snapshotFromRecord(
      { enabled: false, time: "07:30", lastDailyDay: "2026-10-11", lastWeeklyWeekStart: "2026-09-28" },
      { practiceDays: ["2026-10-11", "2026-10-12"], lastPracticeDay: "2026-10-12" },
    );
    expect(commitDelivery(planned, fresh)).toBeNull();
  });

  it("schedules the open page for the next Shanghai reminder, not a tight loop", () => {
    const state = saveReminderSettings(memoryStorage(), { enabled: true, time: "20:00" }, at("2026-10-08", "09:00"));
    const next = nextReminderCheck(state, [], at("2026-10-08", "12:00"));
    expect(next).toBe(shanghaiInstant("2026-10-08", "20:00"));
  });
});

describe("reminder delivery limits", () => {
  it("states the iOS gap and the Android periodic-sync limit in the source the worker runs", () => {
    expect(REMINDER_CAPABILITIES.iosSafari).toMatch(/no Periodic Background Sync/i);
    expect(REMINDER_CAPABILITIES.iosHomeScreen).toMatch(/server/i);
    expect(REMINDER_CAPABILITIES.androidChromeInstalled).toMatch(/not an exact alarm/i);
    expect(REMINDER_CAPABILITIES.androidChromeTab).toMatch(/next time the page is opened/i);
    expect(REMINDER_SYNC_TAG).toBe("echo-practice-reminder");
    const worker = readFileSync("src/practice/echo-sync-sw.ts", "utf8");
    expect(worker).toContain("periodicsync");
    expect(worker).toContain("showNotification");
    expect(worker).not.toContain("localStorage");
    expect(readFileSync("vite.config.ts", "utf8")).toContain('importScripts: command === "build" ? ["echo-sync.js"]');
  });
});
