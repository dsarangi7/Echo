import { requestNotificationPermission, setReminder, type ReminderPreference } from "../streak";

/**
 * Writes the reminder preference through Kai's contract.
 * Asks for permission only when the toggle turns on.
 * Does not schedule a notification — that stays with Kai.
 */
export async function saveReminderPreference(next: ReminderPreference): Promise<void> {
  setReminder(next);
  if (next.enabled) await requestNotificationPermission();
}
