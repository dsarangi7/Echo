import { useEffect, useState } from "react";
import { isAndroidShell, armNativeReminder, reminderArmListener, type SyncResult } from "../native/syncReminders";
import {
  REMINDER_ANDROID_BATTERY,
  REMINDER_ANDROID_CLOCK,
  REMINDER_ANDROID_DENIED,
  REMINDER_ANDROID_EXACT,
  REMINDER_ANDROID_FAILED,
  REMINDER_ANDROID_ON,
} from "../native/reminderCopy";
import { publishPracticeSnapshot } from "../practice/reminder-runtime";
import { parseReminderTime } from "../practice/reminder";
import { usePracticeStreak, useReminderSettings } from "../practice/usePracticeSignals";

function alertCopy(result: SyncResult | null): { en: string; zh: string } | null {
  if (result === "denied") return REMINDER_ANDROID_DENIED;
  if (result === "exact-denied") return REMINDER_ANDROID_EXACT;
  if (result === "failed") return REMINDER_ANDROID_FAILED;
  return null;
}

/** Android reminder card. Hidden on the website, which keeps the streak-strip control. */
export function ReminderCard() {
  const streak = usePracticeStreak();
  const reminder = useReminderSettings();
  const [native, setNative] = useState(isAndroidShell);
  const [problem, setProblem] = useState<SyncResult | null>(null);

  useEffect(() => {
    setNative(isAndroidShell());
    return reminderArmListener((detail) => setProblem(detail.result === "off" || detail.result === "skipped" ? null : detail.result));
  }, []);

  if (!native) return null;

  const alert = alertCopy(problem);
  const on = reminder.enabled && problem !== "denied" && problem !== "exact-denied" && problem !== "failed";

  const apply = async (enabled: boolean, time: string) => {
    const parsed = parseReminderTime(time) ?? reminder.time;
    const turningOn = enabled && !reminder.enabled;
    const result = await armNativeReminder({ enabled, time: parsed, test: turningOn });
    setProblem(result === "off" || result === "skipped" ? null : result);
    void publishPracticeSnapshot();
  };

  return (
    <section className="card reminder-card" id="reminders" aria-labelledby="reminders-title">
      <h2 id="reminders-title">
        Reminders <small>提醒</small>
      </h2>
      <p className="legend" id="streak-summary">
        This week: {streak.daysThisWeek} {streak.daysThisWeek === 1 ? "day" : "days"} · Streak: {streak.current}. 本周{" "}
        {streak.daysThisWeek} 天 · 连续 {streak.current} 天。 A Shanghai day counts after one Clear or Partial Say-it.
        上海时间，说一说听清或部分即算一天。
      </p>
      <div className="reminder-fields">
        <label htmlFor="daily-reminder">
          <input
            id="daily-reminder"
            type="checkbox"
            checked={reminder.enabled}
            onChange={(event) => void apply(event.target.checked, reminder.time)}
          />
          <span>
            Daily reminder <small>每天提醒</small>
          </span>
        </label>
        <input
          id="daily-time"
          type="time"
          aria-label="Reminder time on this phone"
          value={reminder.time}
          onChange={(event) => void apply(reminder.enabled, event.target.value)}
        />
      </div>
      <p className="legend">
        {REMINDER_ANDROID_CLOCK.en} {REMINDER_ANDROID_CLOCK.zh}
      </p>
      {on ? (
        <p className="reminder-alert is-on" id="reminder-note" role="status">
          <b>{REMINDER_ANDROID_ON.en}</b>
          <small>{REMINDER_ANDROID_ON.zh}</small>
          <span>{REMINDER_ANDROID_BATTERY.en}</span>
          <small>{REMINDER_ANDROID_BATTERY.zh}</small>
        </p>
      ) : null}
      {alert ? (
        <p className="reminder-alert" id="reminder-note" role="alert">
          <b>{alert.en}</b>
          <small>{alert.zh}</small>
        </p>
      ) : null}
    </section>
  );
}
