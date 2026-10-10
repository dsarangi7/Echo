import { useEffect, useState } from "react";
import { armNativeReminder, isAndroidShell, reminderArmListener, type SyncResult } from "../native/syncReminders";
import {
  REMINDER_ANDROID_BATTERY,
  REMINDER_ANDROID_CLOCK,
  REMINDER_ANDROID_DENIED,
  REMINDER_ANDROID_EXACT,
  REMINDER_ANDROID_FAILED,
  REMINDER_ANDROID_ON,
} from "../native/reminderCopy";
import { disableDailyReminder, enableDailyReminder, publishPracticeSnapshot } from "../practice/reminder-runtime";
import { parseReminderTime, reminderSlotPassed, type ReminderState } from "../practice/reminder";
import { localDateKey } from "../practice/shanghai";
import { usePracticeStreak, useReminderSettings } from "../practice/usePracticeSignals";
import { REMINDER_IOS_HINT, REMINDER_LOCAL_TIME, REMINDER_PASSED, reminderWaitingCopy } from "../ui/streakCopy";

function webStatus(reminder: ReminderState, now = new Date()): { en: string; zh: string } | null {
  if (isAndroidShell() || !reminder.enabled) return null;
  if (!reminderSlotPassed(reminder.time, now)) return reminderWaitingCopy(reminder.time);
  if (reminder.lastDailyDay === localDateKey(now)) return REMINDER_PASSED;
  return null;
}

function alertCopy(result: SyncResult | null): { en: string; zh: string } | null {
  if (result === "denied") return REMINDER_ANDROID_DENIED;
  if (result === "exact-denied") return REMINDER_ANDROID_EXACT;
  if (result === "failed") return REMINDER_ANDROID_FAILED;
  return null;
}

/** Website card plus the Android shell. The shell asks for permission before it stays on. */
export function ReminderCard() {
  const streak = usePracticeStreak();
  const reminder = useReminderSettings();
  const [native, setNative] = useState(isAndroidShell);
  const [problem, setProblem] = useState<SyncResult | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    setNative(isAndroidShell());
    return reminderArmListener((detail) => setProblem(detail.result === "off" || detail.result === "skipped" ? null : detail.result));
  }, []);

  const apply = async (enabled: boolean, time: string) => {
    const parsed = parseReminderTime(time) ?? reminder.time;
    if (native) {
      const turningOn = enabled && !reminder.enabled;
      const result = await armNativeReminder({ enabled, time: parsed, test: turningOn });
      setProblem(result === "off" || result === "skipped" ? null : result);
      setNote("");
      void publishPracticeSnapshot();
      return;
    }
    setProblem(null);
    if (!enabled) {
      disableDailyReminder();
      setNote("");
      return;
    }
    const result = await enableDailyReminder(parsed);
    if (!result.ok && result.reason === "denied") {
      setNote("Allow notifications in the browser to use this reminder. 请在浏览器里允许通知。");
      return;
    }
    if (!result.ok) {
      setNote("This browser cannot schedule a fixed-time alert. The Android app can. 这个浏览器不能定时提醒，Android 应用可以。");
      return;
    }
    setNote("");
  };

  const alert = native ? alertCopy(problem) : null;
  const on = native && reminder.enabled && problem !== "denied" && problem !== "exact-denied" && problem !== "failed";
  const status = note || native ? null : webStatus(reminder);

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
      <div className="reminder-row">
        <label htmlFor="daily-reminder">
          <input
            id="daily-reminder"
            type="checkbox"
            checked={native ? on : reminder.enabled}
            onChange={(event) => void apply(event.target.checked, reminder.time)}
          />
          <span>
            Daily reminder <small>每天提醒</small>
          </span>
        </label>
        <input
          id="daily-time"
          type="time"
          aria-label={native ? "Reminder time on this phone" : "Reminder time, local"}
          value={reminder.time}
          onChange={(event) => void apply(reminder.enabled, event.target.value)}
        />
      </div>
      {native ? (
        <p className="legend">
          {REMINDER_ANDROID_CLOCK.en} {REMINDER_ANDROID_CLOCK.zh}
        </p>
      ) : (
        <p className="legend" id="reminder-platform">
          <span>{REMINDER_IOS_HINT.en}</span>
          <small>{REMINDER_IOS_HINT.zh}</small>
          <span>{REMINDER_LOCAL_TIME.en}</span>
          <small>{REMINDER_LOCAL_TIME.zh}</small>
        </p>
      )}
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
      ) : note ? (
        <p className="legend" id="reminder-note" role="status">
          {note}
        </p>
      ) : status ? (
        <p className="legend" id="reminder-note" role="status">
          <span>{status.en}</span>
          <small>{status.zh}</small>
        </p>
      ) : null}
    </section>
  );
}
