import { useState } from "react";
import { isAndroidShell, syncNativeReminders } from "../native/syncReminders";
import { disableDailyReminder, enableDailyReminder, publishPracticeSnapshot } from "../practice/reminder-runtime";
import { parseReminderTime, saveReminderSettings } from "../practice/reminder";
import { practiceLocalStorage } from "../practice/streak";
import { usePracticeStreak, useReminderSettings } from "../practice/usePracticeSignals";

export function ReminderCard() {
  const streak = usePracticeStreak();
  const reminder = useReminderSettings();
  const [note, setNote] = useState("");

  const apply = async (enabled: boolean, time: string) => {
    const parsed = parseReminderTime(time) ?? reminder.time;
    const storage = practiceLocalStorage();
    if (!storage) return;
    if (isAndroidShell()) {
      saveReminderSettings(storage, { enabled, time: parsed });
      void publishPracticeSnapshot();
      const result = await syncNativeReminders();
      if (enabled && result === "denied") {
        saveReminderSettings(storage, { enabled: false, time: parsed });
        setNote("Allow notifications to ring at this time. 请允许通知，才能按时提醒。");
        return;
      }
      setNote("");
      return;
    }
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
    if (!result.ok && result.reason === "unsupported") {
      setNote("This browser cannot schedule a fixed-time alert. The Android app can. 这个浏览器不能定时提醒，Android 应用可以。");
      return;
    }
    setNote("");
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
      <div className="reminder-row">
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
          aria-label="Reminder time, Shanghai"
          value={reminder.time}
          onChange={(event) => void apply(reminder.enabled, event.target.value)}
        />
      </div>
      <p className="legend">
        The time is Shanghai time. The Android app rings every day then, and on Monday sends the week summary. The site
        stores the same reminder. 时间按上海。Android 应用每天这个点提醒，周一发送本周总结。网页保存的是同一条设置。
      </p>
      {note ? (
        <p className="legend" id="reminder-note">
          {note}
        </p>
      ) : null}
    </section>
  );
}
