import { LocalNotifications, type ScheduleResult } from "@capacitor/local-notifications";
import { migrateLegacyPracticeStorage } from "./legacyReminder";
import { gateReminderPermissions, shouldPersistEnabled, type ArmResult, type ExactAlarmState, type NotificationPermissionState } from "./reminderAccess";
import {
  LEGACY_CHANNEL_ID,
  REMINDER_IDS,
  TEST_FIRED_KEY,
  buildNativeReminderPlan,
  buildTestReminder,
  practiceChannel,
} from "./reminderPlan";
import { REMINDER_CHANGED_EVENT, loadReminder, saveReminderSettings } from "../practice/reminder";
import { practiceLocalStorage, readStreakRecord } from "../practice/streak";

export { TEST_FIRED_KEY } from "./reminderPlan";

type NativeBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function bridge(): NativeBridge | null {
  const host = globalThis as { Capacitor?: NativeBridge };
  return host.Capacitor ?? null;
}

/** True inside the Capacitor Android shell. False on the website. */
export function isAndroidShell(): boolean {
  const cap = bridge();
  return Boolean(cap?.isNativePlatform?.() && cap.getPlatform?.() === "android");
}

export type SyncResult = ArmResult;

export const REMINDER_ARM_EVENT = "echo-reminder-arm";

export type ReminderArmDetail = { result: SyncResult };

function emitArm(result: SyncResult): void {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<ReminderArmDetail>(REMINDER_ARM_EVENT, { detail: { result } }));
  } catch {
    /* private mode */
  }
}

async function cancelReminders(): Promise<void> {
  await LocalNotifications.cancel({ notifications: REMINDER_IDS.map((id) => ({ id })) });
}

async function readExactAlarm(): Promise<ExactAlarmState> {
  try {
    const status = await LocalNotifications.checkExactNotificationSetting();
    const value = status.exact_alarm;
    if (value === "granted" || value === "denied" || value === "prompt" || value === "prompt-with-rationale") return value;
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * Ask for notification permission, then exact alarms on Android 12+.
 * Does not schedule. Opens the exact-alarm settings page when that grant is missing.
 */
export async function prepareReminderPermissions(options?: { openExactSettings?: boolean }): Promise<ReturnType<typeof gateReminderPermissions>> {
  let display: NotificationPermissionState = "prompt";
  try {
    const checked = await LocalNotifications.checkPermissions();
    display = checked.display;
    if (display !== "granted") {
      const asked = await LocalNotifications.requestPermissions();
      display = asked.display;
    }
  } catch {
    return "need-notification";
  }
  const exactAlarm = await readExactAlarm();
  const gate = gateReminderPermissions({ display, exactAlarm });
  if (gate === "need-exact" && options?.openExactSettings) {
    try {
      await LocalNotifications.changeExactNotificationSetting();
    } catch {
      /* The settings page did not open. The card still explains how to allow it. */
    }
  }
  return gate;
}

function persist(enabled: boolean, time: string, now: Date): void {
  const storage = practiceLocalStorage();
  if (!storage) return;
  saveReminderSettings(storage, { enabled, time }, now);
}

/**
 * Rebuild daily and Monday alarms from the saved reminder.
 * No-op on the website. Pass `test: true` when the user has just turned the reminder on.
 * A phone that already had the reminder on (1.0.0) gets one test meow the first time
 * scheduling actually succeeds.
 */
export async function syncNativeReminders(options?: { test?: boolean; now?: Date }): Promise<SyncResult> {
  if (!isAndroidShell()) return "skipped";
  const now = options?.now ?? new Date();
  const storage = practiceLocalStorage();
  if (!storage) return "failed";
  try {
    migrateLegacyPracticeStorage(storage, now);
    const state = loadReminder(storage);
    if (!state.enabled) {
      await cancelReminders();
      return "off";
    }
    const includeTest = options?.test === true || storage.getItem(TEST_FIRED_KEY) !== "1";
    return await commitSchedule(state.time, includeTest, now, false);
  } catch (error) {
    console.warn("Echo reminders were not scheduled", error);
    persist(false, loadReminder(storage).time, now);
    emitArm("failed");
    return "failed";
  }
}

/**
 * Call from the reminder switch, inside the click.
 * Enabled is saved only after notifications are actually scheduled.
 */
export async function armNativeReminder(input: { enabled: boolean; time: string; test?: boolean; now?: Date }): Promise<SyncResult> {
  const now = input.now ?? new Date();
  if (!isAndroidShell()) return "skipped";
  const storage = practiceLocalStorage();
  if (!storage) return "failed";
  migrateLegacyPracticeStorage(storage, now);
  if (!input.enabled) {
    persist(false, input.time, now);
    try {
      await cancelReminders();
    } catch (error) {
      console.warn("Echo reminders were not cancelled", error);
    }
    emitArm("off");
    return "off";
  }
  return commitSchedule(input.time, input.test !== false, now, true);
}

async function commitSchedule(time: string, includeTest: boolean, now: Date, openExactSettings: boolean): Promise<SyncResult> {
  const storage = practiceLocalStorage();
  if (!storage) return "failed";
  const gate = await prepareReminderPermissions({ openExactSettings });
  if (gate === "need-notification") {
    persist(false, time, now);
    emitArm("denied");
    return "denied";
  }
  if (gate === "need-exact") {
    persist(false, time, now);
    emitArm("exact-denied");
    return "exact-denied";
  }

  const state = { ...loadReminder(storage), enabled: true, time };
  const days = readStreakRecord(storage).practiceDays;
  const notifications = buildNativeReminderPlan(state, days, now);
  if (includeTest) notifications.push(buildTestReminder(now));
  try {
    await LocalNotifications.deleteChannel({ id: LEGACY_CHANNEL_ID });
  } catch {
    /* The 1.0.0 channel may not exist. */
  }
  await LocalNotifications.createChannel(practiceChannel());
  await cancelReminders();
  let scheduled: ScheduleResult;
  try {
    scheduled = await LocalNotifications.schedule({ notifications });
  } catch (error) {
    console.warn("Echo reminders were not scheduled", error);
    persist(false, time, now);
    emitArm("failed");
    return "failed";
  }
  if (scheduled.warning) {
    try {
      await cancelReminders();
    } catch {
      /* already failed to be exact */
    }
    persist(false, time, now);
    emitArm("exact-denied");
    return "exact-denied";
  }
  if (includeTest) {
    try {
      storage.setItem(TEST_FIRED_KEY, "1");
    } catch {
      /* the meow can still fire */
    }
  }
  if (!shouldPersistEnabled("scheduled")) return "failed";
  persist(true, time, now);
  emitArm("scheduled");
  return "scheduled";
}

export function reminderArmListener(onArm: (detail: ReminderArmDetail) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ReminderArmDetail>).detail;
    if (detail) onArm(detail);
  };
  window.addEventListener(REMINDER_ARM_EVENT, handler);
  return () => window.removeEventListener(REMINDER_ARM_EVENT, handler);
}

/** Re-export so a storage write from arm still refreshes the card. */
export { REMINDER_CHANGED_EVENT };
