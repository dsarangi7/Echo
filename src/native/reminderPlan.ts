import { daysInShanghaiWeek, dailyNudgeCopy, weeklyNudgeCopy, type ReminderState } from "../practice/reminder";
import {
  addShanghaiDays,
  parseClock,
  reminderMinutes,
  shanghaiDateKey,
  shanghaiMinutes,
  shanghaiWeekStart,
} from "../practice/shanghai";

export const DAILY_NOTIFICATION_ID = 91001;
export const WEEKLY_NOTIFICATION_ID = 91002;
export const PRACTICE_CHANNEL_ID = "echo-practice";

/** Capacitor Weekday.Monday. Sunday is 1. */
export const MONDAY = 2;

export type NativeReminder = {
  id: number;
  title: string;
  body: string;
  channelId: string;
  autoCancel: true;
  schedule: {
    repeats: true;
    allowWhileIdle: true;
    on: { hour: number; minute: number; weekday?: number };
  };
};

/**
 * Monday alarm summarizes the Shanghai week that will have just ended.
 * Before the chosen time on Monday, that week is the previous one.
 * After that, the next Monday summarizes the week now in progress.
 */
export function weekStartForNextMondaySummary(now: Date, time: string): string {
  const today = shanghaiDateKey(now);
  const thisMonday = shanghaiWeekStart(now);
  const target = reminderMinutes(time) ?? 0;
  if (today === thisMonday && shanghaiMinutes(now) < target) {
    return addShanghaiDays(thisMonday, -7);
  }
  return thisMonday;
}

/**
 * Local notifications for an `echo-practice-reminder` record.
 * The daily line repeats at that Shanghai clock time. The weekly line repeats
 * on Monday at the same time, using `weeklyNudgeCopy` from the web module.
 * Returns nothing when the reminder is off.
 */
export function buildNativeReminderPlan(
  state: ReminderState,
  practiceDays: readonly string[],
  now: Date,
): NativeReminder[] {
  if (!state.enabled) return [];
  const clock = parseClock(state.time);
  if (!clock) return [];
  const daily = dailyNudgeCopy();
  const weekStart = weekStartForNextMondaySummary(now, state.time);
  const weekly = weeklyNudgeCopy(daysInShanghaiWeek(practiceDays, weekStart));
  const on = { hour: clock.hour, minute: clock.minute };
  return [
    {
      id: DAILY_NOTIFICATION_ID,
      title: daily.title,
      body: daily.body,
      channelId: PRACTICE_CHANNEL_ID,
      autoCancel: true,
      schedule: { repeats: true, allowWhileIdle: true, on },
    },
    {
      id: WEEKLY_NOTIFICATION_ID,
      title: weekly.title,
      body: weekly.body,
      channelId: PRACTICE_CHANNEL_ID,
      autoCancel: true,
      schedule: { repeats: true, allowWhileIdle: true, on: { ...on, weekday: MONDAY } },
    },
  ];
}
