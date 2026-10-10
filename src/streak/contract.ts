/**
 * Kai's streak + reminder contract.
 *
 * TEMP / TODO Kai: `src/streak/stub.ts` is a signature stand-in only.
 * Replace the re-export in `src/streak/index.ts` when his module lands.
 * UI chrome imports from `src/streak` and does not count practice days.
 */

/** Asia/Shanghai practice-day record. Kai owns storage and updates. */
export type PracticeStreak = {
  currentStreak: number;
  bestStreak: number;
  /** YYYY-MM-DD in Asia/Shanghai. */
  lastPracticeDay: string;
};

/** What the flame strip reads. */
export type StreakSummary = {
  current: number;
  best: number;
};

/** 24-hour clock, device local time. */
export type ReminderPreference = {
  enabled: boolean;
  hour: number;
  minute: number;
};

/**
 * Result of asking for notification permission.
 * Scheduling stays with Kai — "unavailable" means the chrome must not pretend a push was set.
 */
export type NotificationPermissionResult = "granted" | "denied" | "unavailable";
