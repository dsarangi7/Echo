/**
 * TEMP / TODO Kai
 *
 * In-memory stand-in so the streak chrome can build and the controls can move.
 * No localStorage, no Notification scheduling, no Capacitor.
 * `recordPracticeClearOrPartial` is intentionally a no-op — day counts belong to Kai
 * (Shanghai calendar, Clear or Partial only, never Mic unsure).
 * Delete this file's behavior by repointing `src/streak/index.ts` at his module.
 */

import type { NotificationPermissionResult, ReminderPreference, StreakSummary } from "./contract";

let summary: StreakSummary = { current: 0, best: 0 };

let reminder: ReminderPreference = { enabled: false, hour: 20, minute: 0 };

function clamp(value: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

export function getStreak(): StreakSummary {
  return { ...summary };
}

export function getReminder(): ReminderPreference {
  return { ...reminder };
}

export function setReminder(next: ReminderPreference): void {
  reminder = {
    enabled: next.enabled === true,
    hour: clamp(next.hour, 23, 20),
    minute: clamp(next.minute, 59, 0),
  };
}

/** TEMP / TODO Kai — does not call Notification or schedule anything. */
export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  return "unavailable";
}

/** TEMP / TODO Kai — practice UI must not call this. Days are his. */
export function recordPracticeClearOrPartial(): void {
  return;
}
