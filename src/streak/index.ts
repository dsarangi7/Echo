/**
 * TEMP / TODO Kai
 * Swap this re-export to Kai's module when it lands. Keep the signatures:
 * getStreak, getReminder, setReminder, requestNotificationPermission,
 * recordPracticeClearOrPartial.
 */

export type {
  NotificationPermissionResult,
  PracticeStreak,
  ReminderPreference,
  StreakSummary,
} from "./contract";

export {
  getReminder,
  getStreak,
  recordPracticeClearOrPartial,
  requestNotificationPermission,
  setReminder,
} from "./stub";
