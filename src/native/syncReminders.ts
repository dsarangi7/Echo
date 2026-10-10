import { LocalNotifications } from "@capacitor/local-notifications";
import { migrateLegacyPracticeStorage } from "./legacyReminder";
import {
  DAILY_NOTIFICATION_ID,
  PRACTICE_CHANNEL_ID,
  WEEKLY_NOTIFICATION_ID,
  buildNativeReminderPlan,
} from "./reminderPlan";
import { loadReminder } from "../practice/reminder";
import { practiceLocalStorage, readStreakRecord } from "../practice/streak";

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

export type SyncResult = "skipped" | "scheduled" | "denied" | "off";

/**
 * Rebuild the daily and Monday local notifications from `echo-practice-reminder`
 * and `echo-practice-streak`. No-op on the website.
 */
export async function syncNativeReminders(now = new Date()): Promise<SyncResult> {
  if (!isAndroidShell()) return "skipped";
  try {
    const storage = practiceLocalStorage();
    if (storage) migrateLegacyPracticeStorage(storage, now);
    const state = loadReminder(storage);
    const days = readStreakRecord(storage).practiceDays;
    const plan = buildNativeReminderPlan(state, days, now);
    if (plan.length > 0) {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const asked = await LocalNotifications.requestPermissions();
        if (asked.display !== "granted") return "denied";
      }
      await LocalNotifications.createChannel({
        id: PRACTICE_CHANNEL_ID,
        name: "Practice reminders",
        description: "Daily practice reminder and the weekly Shanghai streak summary",
        importance: 4,
        visibility: 1,
      });
    }
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_NOTIFICATION_ID }, { id: WEEKLY_NOTIFICATION_ID }],
    });
    if (plan.length === 0) return "off";
    await LocalNotifications.schedule({ notifications: plan });
    return "scheduled";
  } catch (error) {
    console.warn("Echo reminders were not scheduled", error);
    return "off";
  }
}
