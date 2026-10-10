import { nextDeviceMonday } from "../practice/deviceClock";
import { daysInShanghaiWeek, dailyNudgeCopy, previousShanghaiWeek, weeklyNudgeCopy, type ReminderState } from "../practice/reminder";
import { parseClock } from "../practice/shanghai";

export const DAILY_NOTIFICATION_ID = 91001;
export const WEEKLY_NOTIFICATION_ID = 91002;
export const TEST_NOTIFICATION_ID = 91003;
/** One minute. Long enough to leave the toggle, short enough to trust the install. */
export const TEST_DELAY_MS = 60_000;
/** Set after the first successful test meow so opening the app does not meow every time. */
export const TEST_FIRED_KEY = "echo-reminder-test-fired";

/** New id so Android 8+ picks up the meow. An existing channel cannot change its sound. */
export const PRACTICE_CHANNEL_ID = "echo-practice-v2";
export const LEGACY_CHANNEL_ID = "echo-practice";

/** res/raw/echo_meow.wav. Channel sound is the resource name, without the extension. */
export const MEOW_SOUND = "echo_meow";
/** Notification `sound` includes the extension (Android 7 and the Capacitor field). */
export const MEOW_FILE = "echo_meow.wav";

/** Android NotificationManager.IMPORTANCE_HIGH. Heads-up, makes a sound. */
export const CHANNEL_IMPORTANCE_HIGH = 4;

/** Capacitor Weekday.Monday. Sunday is 1. */
export const MONDAY = 2;

export type RepeatingOn = { hour: number; minute: number; weekday?: number };

export type NativeReminder = {
  id: number;
  title: string;
  body: string;
  channelId: string;
  sound: string;
  smallIcon: string;
  autoCancel: true;
  /** Exact alarm. Inexact Doze delivery is what made 1.0.0 look like silence. */
  isExactNotification: true;
  isExactMandatory: true;
  schedule:
    | { repeats: true; allowWhileIdle: true; on: RepeatingOn }
    | { repeats: false; allowWhileIdle: true; at: Date };
};

export function practiceChannel(): {
  id: string;
  name: string;
  description: string;
  importance: 4;
  visibility: 1;
  sound: string;
  vibration: true;
} {
  return {
    id: PRACTICE_CHANNEL_ID,
    name: "Practice reminders",
    description: "Daily practice reminder and the Monday streak summary",
    importance: CHANNEL_IMPORTANCE_HIGH,
    visibility: 1,
    sound: MEOW_SOUND,
    vibration: true,
  };
}

/**
 * Shanghai week the next device-local Monday alarm should summarize.
 * The fire time is phone-local. The counted days stay Asia/Shanghai.
 */
export function weekStartForNextMondaySummary(now: Date, time: string): string {
  return previousShanghaiWeek(nextDeviceMonday(now, time));
}

function base(id: number, title: string, body: string, schedule: NativeReminder["schedule"]): NativeReminder {
  return {
    id,
    title,
    body,
    channelId: PRACTICE_CHANNEL_ID,
    sound: MEOW_FILE,
    smallIcon: "ic_stat_echo",
    autoCancel: true,
    isExactNotification: true,
    isExactMandatory: true,
    schedule,
  };
}

/**
 * Local notifications for an `echo-practice-reminder` record.
 * `time` is HH:MM on the phone. It is passed through as `on.hour` / `on.minute`
 * with no Asia/Shanghai shift. Returns nothing when the reminder is off.
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
    base(DAILY_NOTIFICATION_ID, daily.title, daily.body, {
      repeats: true,
      allowWhileIdle: true,
      on,
    }),
    base(WEEKLY_NOTIFICATION_ID, weekly.title, weekly.body, {
      repeats: true,
      allowWhileIdle: true,
      on: { ...on, weekday: MONDAY },
    }),
  ];
}

/** One-shot meow about a minute after the reminder is turned on. */
export function buildTestReminder(now: Date): NativeReminder {
  return base(
    TEST_NOTIFICATION_ID,
    "课猫 Echo",
    "Reminder is on. 提醒已打开。 This meow means the alarm can reach you. 听到猫叫，说明闹钟能送到。",
    {
      at: new Date(now.getTime() + TEST_DELAY_MS),
      allowWhileIdle: true,
      repeats: false,
    },
  );
}

export const REMINDER_IDS = [DAILY_NOTIFICATION_ID, WEEKLY_NOTIFICATION_ID, TEST_NOTIFICATION_ID] as const;
