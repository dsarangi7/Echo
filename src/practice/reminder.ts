import { readStreakRecord, type StreakRecord } from "./streak";
import {
  addShanghaiDays,
  countDaysInRange,
  isShanghaiDayKey,
  laterDay,
  normalizePracticeDays,
  parseReminderTime,
  reminderMinutes,
  shanghaiDateKey,
  shanghaiInstant,
  shanghaiMinutes,
  shanghaiWeekStart,
} from "./shanghai";

export { parseReminderTime } from "./shanghai";

/**
 * Daily reminder + weekly summary. Logic and notification copy only — Chan owns
 * the time picker and the enable toggle.
 *
 * Chan:
 * - `useReminderSettings()` in `./usePracticeSignals` for the saved time and enabled flag.
 * - On toggle / time change from a click: `enableDailyReminder(time)` or `disableDailyReminder()`
 *   in `./reminder-runtime`. Those request notification permission and arm delivery.
 * - Do not write localStorage yourself.
 *
 * localStorage key: `echo-practice-reminder`
 * ```
 * { enabled, time: "HH:MM", lastDailyDay: "YYYY-MM-DD" | null, lastWeeklyWeekStart: "YYYY-MM-DD" | null }
 * ```
 * `time` is a 24-hour clock in Asia/Shanghai, same calendar as the streak.
 * `lastWeeklyWeekStart` is the Monday of the last completed week already summarized.
 *
 * The service worker mirror (not for Chan) is IndexedDB `echo-practice-sync` / store `kv` / key `snapshot`.
 * One Periodic Background Sync tag, `echo-practice-reminder`, checks both the daily nudge and the weekly summary.
 */
export const REMINDER_STORAGE_KEY = "echo-practice-reminder";
export const REMINDER_CHANGED_EVENT = "echo-reminder-changed";
export const REMINDER_SYNC_TAG = "echo-practice-reminder";
export const DEFAULT_REMINDER_TIME = "20:00";

/**
 * What the browser can actually do. Android Chrome can wake an installed PWA
 * with Periodic Background Sync, but not at an exact minute. iOS cannot.
 */
export const REMINDER_CAPABILITIES = {
  streak:
    "Current and best streak live in localStorage on this device. A day is a calendar day in Asia/Shanghai, and it counts when Say it records at least one Clear or Partial.",
  androidChromeInstalled:
    "An installed Android Chrome PWA can register Periodic Background Sync. Chrome may wake the service worker about every 12 hours or later, and the nudge is shown then if the Shanghai clock is already past the chosen time. That is not an exact alarm.",
  androidChromeTab:
    "A normal Android Chrome tab can notify while the page is open, and the next time the page is opened after the chosen time. Periodic Background Sync is usually refused until the PWA is installed.",
  iosSafari:
    "iOS Safari has no Periodic Background Sync. Once Safari suspends the page, a timer cannot fire. A notification at a fixed clock time is not possible while the page is closed. On the next open, if notification permission was already granted, the page can show the nudge then.",
  iosHomeScreen:
    "An iPhone or iPad home-screen PWA has the same gap: no local scheduled notification and no background sync. Web Push would need a server, and Echo does not have one. The weekly summary and the daily nudge wait until the next open.",
} as const;

export type ReminderState = {
  enabled: boolean;
  /** 24-hour HH:MM in Asia/Shanghai. */
  time: string;
  /** Shanghai day we already showed the daily nudge for. */
  lastDailyDay: string | null;
  /** Monday of the last completed Shanghai week we already summarized. */
  lastWeeklyWeekStart: string | null;
};

export type DueNotice =
  | { kind: "daily"; day: string; title: string; body: string }
  | { kind: "weekly"; weekStart: string; days: number; title: string; body: string };

export type SyncSnapshot = {
  version: 1;
  reminder: ReminderState;
  practiceDays: string[];
  lastPracticeDay: string | null;
};

export function emptyReminder(): ReminderState {
  return {
    enabled: false,
    time: DEFAULT_REMINDER_TIME,
    lastDailyDay: null,
    lastWeeklyWeekStart: null,
  };
}

export function dailyNudgeCopy(): { title: string; body: string } {
  return {
    title: "课猫 Echo",
    body: "Time to practice. 该练一句了。",
  };
}

export function weeklyNudgeCopy(days: number): { title: string; body: string } {
  const count = Math.max(0, Math.floor(days));
  const word = count === 1 ? "day" : "days";
  return {
    title: "课猫 Echo",
    body: `You practiced ${count} ${word} this week — keep the streak. 这周你练了 ${count} 天——保持连续打卡。`,
  };
}

function dayOrNull(value: unknown): string | null {
  return typeof value === "string" && isShanghaiDayKey(value) ? value : null;
}

export function normalizeReminder(value: Partial<ReminderState> | null | undefined): ReminderState {
  const time = parseReminderTime(String(value?.time ?? "")) ?? DEFAULT_REMINDER_TIME;
  return {
    enabled: value?.enabled === true,
    time,
    lastDailyDay: dayOrNull(value?.lastDailyDay),
    lastWeeklyWeekStart: dayOrNull(value?.lastWeeklyWeekStart),
  };
}

export function loadReminder(storage: Pick<Storage, "getItem"> | null): ReminderState {
  if (!storage) return emptyReminder();
  try {
    const raw = storage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return emptyReminder();
    return normalizeReminder(JSON.parse(raw) as Partial<ReminderState>);
  } catch {
    return emptyReminder();
  }
}

function emitReminderChanged(storage: Pick<Storage, "getItem" | "setItem">): void {
  try {
    if (typeof localStorage === "undefined" || storage !== localStorage) return;
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(REMINDER_CHANGED_EVENT));
  } catch {
    /* private mode */
  }
}

export function writeReminderState(storage: Pick<Storage, "getItem" | "setItem">, state: ReminderState): ReminderState {
  const next = normalizeReminder(state);
  const raw = JSON.stringify(next);
  try {
    if (storage.getItem(REMINDER_STORAGE_KEY) !== raw) {
      storage.setItem(REMINDER_STORAGE_KEY, raw);
      emitReminderChanged(storage);
    }
  } catch {
    /* private mode */
  }
  return next;
}

/**
 * Persist the picker. The first time it turns on, today's slot is skipped when
 * that clock time has already passed, and the previous week is marked summarized
 * so we do not backfill a weekly nudge.
 */
export function saveReminderSettings(
  storage: Pick<Storage, "getItem" | "setItem">,
  input: { enabled: boolean; time: string },
  now = new Date(),
): ReminderState {
  const prev = loadReminder(storage);
  const time = parseReminderTime(input.time) ?? prev.time;
  let lastDailyDay = prev.lastDailyDay;
  let lastWeeklyWeekStart = prev.lastWeeklyWeekStart;
  const turningOn = input.enabled && !prev.enabled;
  if (turningOn) {
    if (!lastWeeklyWeekStart) lastWeeklyWeekStart = addShanghaiDays(shanghaiWeekStart(now), -7);
    const target = reminderMinutes(time);
    if (target != null && shanghaiMinutes(now) >= target) lastDailyDay = shanghaiDateKey(now);
  }
  return writeReminderState(storage, {
    enabled: input.enabled,
    time,
    lastDailyDay,
    lastWeeklyWeekStart,
  });
}

export function previousShanghaiWeek(now: Date): string {
  return addShanghaiDays(shanghaiWeekStart(now), -7);
}

export function daysInShanghaiWeek(practiceDays: readonly string[], weekStart: string): number {
  return countDaysInRange(practiceDays, weekStart, addShanghaiDays(weekStart, 6));
}

/** Notices that should be shown at `now`. Does not mark them shown. */
export function dueNotices(state: ReminderState, practiceDays: readonly string[], now: Date): DueNotice[] {
  if (!state.enabled) return [];
  const notices: DueNotice[] = [];
  const today = shanghaiDateKey(now);
  const target = reminderMinutes(state.time);
  const practicedToday = practiceDays.includes(today);
  if (target != null && !practicedToday && state.lastDailyDay !== today && shanghaiMinutes(now) >= target) {
    notices.push({ kind: "daily", day: today, ...dailyNudgeCopy() });
  }
  const summarizedWeek = previousShanghaiWeek(now);
  if (state.lastWeeklyWeekStart && state.lastWeeklyWeekStart < summarizedWeek) {
    const days = daysInShanghaiWeek(practiceDays, summarizedWeek);
    notices.push({ kind: "weekly", weekStart: summarizedWeek, days, ...weeklyNudgeCopy(days) });
  }
  return notices;
}

export function markNoticeShown(state: ReminderState, notice: DueNotice): ReminderState {
  if (notice.kind === "daily") return { ...state, lastDailyDay: notice.day };
  return { ...state, lastWeeklyWeekStart: notice.weekStart };
}

export function planBackgroundDelivery(snapshot: SyncSnapshot, now: Date): { notices: DueNotice[]; snapshot: SyncSnapshot } {
  const notices = dueNotices(snapshot.reminder, snapshot.practiceDays, now);
  let reminder = snapshot.reminder;
  for (const notice of notices) reminder = markNoticeShown(reminder, notice);
  return { notices, snapshot: { ...snapshot, reminder } };
}

/**
 * Next time the open page should wake to deliver or roll the clock.
 * Null when the reminder is off. Already-due notices are the caller's job first.
 */
export function nextReminderCheck(state: ReminderState, practiceDays: readonly string[], now: Date): number | null {
  if (!state.enabled) return null;
  const time = parseReminderTime(state.time);
  if (!time) return null;
  const today = shanghaiDateKey(now);
  const target = reminderMinutes(time) ?? 0;
  const stillAhead = state.lastDailyDay !== today && !practiceDays.includes(today) && shanghaiMinutes(now) < target;
  const dailyAt = shanghaiInstant(stillAhead ? today : addShanghaiDays(today, 1), time);
  const summarizedWeek = previousShanghaiWeek(now);
  if (state.lastWeeklyWeekStart && state.lastWeeklyWeekStart < summarizedWeek) {
    return Math.min(dailyAt, now.getTime() + 15 * 60 * 1000);
  }
  const nextMonday = shanghaiInstant(addShanghaiDays(shanghaiWeekStart(now), 7), "00:00");
  return Math.min(dailyAt, nextMonday);
}

export function snapshotFromStorage(storage: Pick<Storage, "getItem"> | null): SyncSnapshot {
  const reminder = loadReminder(storage);
  const record = storage ? readStreakRecord(storage) : { current: 0, best: 0, lastPracticeDay: null, practiceDays: [] };
  return snapshotFromRecord(reminder, record);
}

export function snapshotFromRecord(reminder: ReminderState, record: Pick<StreakRecord, "practiceDays" | "lastPracticeDay">): SyncSnapshot {
  return {
    version: 1,
    reminder: normalizeReminder(reminder),
    practiceDays: normalizePracticeDays(record.practiceDays),
    lastPracticeDay: dayOrNull(record.lastPracticeDay),
  };
}

export function isSyncSnapshot(value: unknown): value is SyncSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<SyncSnapshot>;
  return snapshot.version === 1 && !!snapshot.reminder && Array.isArray(snapshot.practiceDays);
}

/** Page settings win. Delivery cursors and practice days move forward only. */
export function mergeSnapshots(page: SyncSnapshot, other: SyncSnapshot | null): SyncSnapshot {
  if (!other) return page;
  return snapshotFromRecord(
    {
      enabled: page.reminder.enabled,
      time: page.reminder.time,
      lastDailyDay: laterDay(page.reminder.lastDailyDay, other.reminder.lastDailyDay),
      lastWeeklyWeekStart: laterDay(page.reminder.lastWeeklyWeekStart, other.reminder.lastWeeklyWeekStart),
    },
    {
      practiceDays: normalizePracticeDays([...page.practiceDays, ...other.practiceDays]),
      lastPracticeDay: laterDay(page.lastPracticeDay, other.lastPracticeDay),
    },
  );
}

/**
 * After the worker shows notices, keep a newer page write. Returns null when the
 * page has turned the reminder off and the worker must not write over that.
 */
export function commitDelivery(planned: SyncSnapshot, fresh: SyncSnapshot | null): SyncSnapshot | null {
  if (fresh && !fresh.reminder.enabled) return null;
  const merged = mergeSnapshots(planned, fresh);
  if (!fresh) return merged;
  return {
    ...merged,
    reminder: {
      ...merged.reminder,
      enabled: fresh.reminder.enabled,
      time: fresh.reminder.time,
    },
  };
}
