/** Pure permission gate for the Android reminder. The plugin calls live in syncReminders. */

export type NotificationPermissionState = "granted" | "denied" | "prompt" | "prompt-with-rationale";
export type ExactAlarmState = NotificationPermissionState | "unavailable";

export type ReminderGate = "schedule" | "need-notification" | "need-exact";

/**
 * Notifications must be granted. On Android 12+ exact alarms must be granted too.
 * `unavailable` means the plugin has no exact-alarm check (API 30 and below).
 */
export function gateReminderPermissions(input: {
  display: NotificationPermissionState;
  exactAlarm: ExactAlarmState;
}): ReminderGate {
  if (input.display !== "granted") return "need-notification";
  if (input.exactAlarm !== "granted" && input.exactAlarm !== "unavailable") return "need-exact";
  return "schedule";
}

export type ArmResult = "scheduled" | "denied" | "exact-denied" | "failed" | "off" | "skipped";

/** Denied, exact-alarm blocked, and schedule errors must not leave enabled=true. */
export function shouldPersistEnabled(result: ArmResult): boolean {
  return result === "scheduled";
}
