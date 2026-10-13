import type { AttemptOutcome } from "./session";
import {
  addShanghaiDays,
  countDaysInRange,
  isShanghaiDayKey,
  normalizePracticeDays,
  shanghaiDateKey,
  shanghaiWeekStart,
} from "./shanghai";

export { SHANGHAI_TZ, shanghaiDateKey } from "./shanghai";

/**
 * Daily practice streak for Chan's badge. This file is logic only — no flame, no copy.
 *
 * Chan:
 * - Call `usePracticeStreak()` from `./usePracticeSignals` for the live badge.
 * - Or call `loadStreak(practiceLocalStorage())` any time. `current` is already
 *   adjusted when a Shanghai day was missed. Do not read the raw JSON for display.
 * - `milestone` / `milestoneJustHit` are 3, 7, or 14. Copy for those days is Hero's.
 * - `echo-streak-changed` is a CustomEvent. `detail` is a StreakUpdate when a Clear or Partial was recorded.
 *   `detail.milestoneJustHit` is the one-shot. A missed-day reset fires the event with no detail.
 *
 * localStorage key: `echo-practice-streak`
 * ```
 * { current, best, lastPracticeDay: "YYYY-MM-DD" | null, practiceDays: string[], completed: number }
 * ```
 * Days are Asia/Shanghai calendar days. A day counts once, when Say it records
 * at least one Clear or Partial. `completed` counts every Clear or Partial sentence.
 * Mic unsure / recognition_fail / miss do not count.
 * Older records omit `completed`; those fall back to `practiceDays.length`
 * (one successful sentence per counted day).
 */
export const STREAK_STORAGE_KEY = "echo-practice-streak";
export const STREAK_CHANGED_EVENT = "echo-streak-changed";
export const STREAK_MILESTONES = [3, 7, 14] as const;

/** Hide the day streak until this many successful Say-it sentences, this session or ever. */
export const STREAK_REVEAL_AFTER = 2;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export type StreakRecord = {
  /** Consecutive counted days ending on lastPracticeDay. 0 after a missed day. */
  current: number;
  best: number;
  /** Last counted day, YYYY-MM-DD in Asia/Shanghai. */
  lastPracticeDay: string | null;
  /** Counted days, oldest first, capped at 400. */
  practiceDays: string[];
  /** Successful Say-it sentences (Clear or Partial), including repeats on the same day. */
  completed: number;
};

export type StreakView = {
  current: number;
  best: number;
  lastPracticeDay: string | null;
  practiceDays: readonly string[];
  /** Clear + Partial sentences ever. At least `practiceDays.length` for older records. */
  completed: number;
  practicedToday: boolean;
  /** Counted days in the Shanghai week that contains `now` (Monday–Sunday). */
  daysThisWeek: number;
  /** Set when `current` is exactly 3, 7, or 14. */
  milestone: StreakMilestone | null;
};

export type StreakUpdate = {
  view: StreakView;
  /** Set when this call moved the streak onto 3, 7, or 14. Same-day repeats stay null. */
  milestoneJustHit: StreakMilestone | null;
  /** True when this call added a new Shanghai practice day. */
  recorded: boolean;
};

export function emptyStreak(): StreakRecord {
  return { current: 0, best: 0, lastPracticeDay: null, practiceDays: [], completed: 0 };
}

/** Clear and Partial lines in this session. Misses and mic-unsure do not count. */
export function sessionSayItCompletions(session: { clear: number; partial: number }): number {
  return countOf(session.clear) + countOf(session.partial);
}

/** The day streak stays hidden until two successful sentences this session, or two ever. */
export function revealPracticeStreak(sessionCompletions: number, lifetimeCompletions: number): boolean {
  return sessionCompletions >= STREAK_REVEAL_AFTER || lifetimeCompletions >= STREAK_REVEAL_AFTER;
}

export function practiceLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function qualifiesForStreak(outcome: AttemptOutcome): boolean {
  return outcome === "clear" || outcome === "partial";
}

export function milestoneForDays(days: number): StreakMilestone | null {
  if (days === 3 || days === 7 || days === 14) return days;
  return null;
}

export function daysPracticedThisWeek(practiceDays: readonly string[], now: Date): number {
  const start = shanghaiWeekStart(now);
  return countDaysInRange(practiceDays, start, addShanghaiDays(start, 6));
}

function countOf(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Missing `completed` means one sentence per counted day. Never under-count those days. */
function lifetimeCompletions(stored: unknown, practiceDays: readonly string[]): number {
  if (stored === undefined || stored === null) return practiceDays.length;
  return Math.max(countOf(stored), practiceDays.length);
}

export function readStreakRecord(storage: Pick<Storage, "getItem"> | null): StreakRecord {
  if (!storage) return emptyStreak();
  try {
    const raw = storage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return emptyStreak();
    const parsed = JSON.parse(raw) as Partial<StreakRecord>;
    const practiceDays = normalizePracticeDays(Array.isArray(parsed.practiceDays) ? parsed.practiceDays.map(String) : []);
    const last = typeof parsed.lastPracticeDay === "string" && isShanghaiDayKey(parsed.lastPracticeDay) ? parsed.lastPracticeDay : null;
    const current = countOf(parsed.current);
    const best = Math.max(countOf(parsed.best), current);
    const completed = lifetimeCompletions(parsed.completed, practiceDays);
    return { current, best, lastPracticeDay: last, practiceDays, completed };
  } catch {
    return emptyStreak();
  }
}

export function viewStreak(record: StreakRecord, now: Date): StreakView {
  const today = shanghaiDateKey(now);
  const yesterday = addShanghaiDays(today, -1);
  const alive = record.lastPracticeDay === today || record.lastPracticeDay === yesterday;
  const current = alive ? record.current : 0;
  const best = Math.max(record.best, current);
  return {
    current,
    best,
    lastPracticeDay: record.lastPracticeDay,
    practiceDays: record.practiceDays,
    completed: record.completed,
    practicedToday: record.lastPracticeDay === today || record.practiceDays.includes(today),
    daysThisWeek: daysPracticedThisWeek(record.practiceDays, now),
    milestone: milestoneForDays(current),
  };
}

function writeRecord(storage: Pick<Storage, "setItem">, record: StreakRecord): boolean {
  try {
    storage.setItem(
      STREAK_STORAGE_KEY,
      JSON.stringify({
        current: record.current,
        best: record.best,
        lastPracticeDay: record.lastPracticeDay,
        practiceDays: record.practiceDays,
        completed: record.completed,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function emitStreakChanged(storage: Pick<Storage, "getItem" | "setItem"> | null, detail?: StreakUpdate): void {
  if (!storage || storage !== practiceLocalStorage()) return;
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(STREAK_CHANGED_EVENT, { detail }));
  } catch {
    /* private mode */
  }
}

/** Display streak. Persists a missed-day reset so stored `current` matches the view. */
export function loadStreak(storage: Pick<Storage, "getItem" | "setItem"> | null, now = new Date()): StreakView {
  const record = readStreakRecord(storage);
  const view = viewStreak(record, now);
  if (storage && (view.current !== record.current || view.best !== record.best)) {
    const wrote = writeRecord(storage, {
      ...record,
      current: view.current,
      best: view.best,
    });
    if (wrote) emitStreakChanged(storage);
  }
  return view;
}

/**
 * Count this Shanghai day toward the streak. The day itself counts once.
 * Every Clear or Partial still adds one to `completed`.
 * Call this only for a Clear or Partial Say-it outcome.
 */
export function recordPracticeClearOrPartial(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  now = new Date(),
): StreakUpdate {
  const before = readStreakRecord(storage);
  const beforeView = viewStreak(before, now);
  if (!storage) return { view: beforeView, milestoneJustHit: null, recorded: false };

  const today = shanghaiDateKey(now);
  const completed = before.completed + 1;
  if (before.lastPracticeDay === today) {
    const needsRepair = before.current < 1 || !before.practiceDays.includes(today);
    if (!needsRepair) {
      const sameDay: StreakRecord = { ...before, completed };
      if (!writeRecord(storage, sameDay)) return { view: beforeView, milestoneJustHit: null, recorded: false };
      const sameDayUpdate: StreakUpdate = { view: viewStreak(sameDay, now), milestoneJustHit: null, recorded: false };
      emitStreakChanged(storage, sameDayUpdate);
      return sameDayUpdate;
    }
    const repaired: StreakRecord = {
      ...before,
      current: Math.max(1, before.current),
      best: Math.max(before.best, Math.max(1, before.current)),
      practiceDays: normalizePracticeDays([...before.practiceDays, today]),
      completed,
    };
    if (!writeRecord(storage, repaired)) return { view: beforeView, milestoneJustHit: null, recorded: false };
    const repairedUpdate: StreakUpdate = { view: viewStreak(repaired, now), milestoneJustHit: null, recorded: false };
    emitStreakChanged(storage, repairedUpdate);
    return repairedUpdate;
  }

  const yesterday = addShanghaiDays(today, -1);
  const current = (before.lastPracticeDay === yesterday ? beforeView.current : 0) + 1;
  const next: StreakRecord = {
    current,
    best: Math.max(before.best, beforeView.best, current),
    lastPracticeDay: today,
    practiceDays: normalizePracticeDays([...before.practiceDays, today]),
    completed,
  };
  if (!writeRecord(storage, next)) return { view: beforeView, milestoneJustHit: null, recorded: false };
  const update: StreakUpdate = {
    view: viewStreak(next, now),
    milestoneJustHit: milestoneForDays(current),
    recorded: true,
  };
  emitStreakChanged(storage, update);
  return update;
}

/** Clear and Partial update the streak. recognition_fail, miss, and anything else do not. */
export function recordSayItOutcome(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  outcome: AttemptOutcome,
  now = new Date(),
): StreakUpdate | null {
  if (!qualifiesForStreak(outcome)) return null;
  return recordPracticeClearOrPartial(storage, now);
}
