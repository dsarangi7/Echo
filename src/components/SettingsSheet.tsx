import { useEffect, useRef, useState } from "react";
import { armNativeReminder, isAndroidShell, reminderArmListener, type SyncResult } from "../native/syncReminders";
import {
  REMINDER_ANDROID_BATTERY,
  REMINDER_ANDROID_DENIED,
  REMINDER_ANDROID_EXACT,
  REMINDER_ANDROID_FAILED,
  REMINDER_ANDROID_ON,
} from "../native/reminderCopy";
import { disableDailyReminder, enableDailyReminder, publishPracticeSnapshot } from "../practice/reminder-runtime";
import { parseReminderTime, reminderSlotPassed, saveReminderSettings } from "../practice/reminder";
import { localDateKey } from "../practice/shanghai";
import { practiceLocalStorage } from "../practice/streak";
import { useReminderSettings } from "../practice/usePracticeSignals";
import { openReminderNote } from "../ui/streakCopy";
import { ReminderControl } from "./ReminderControl";

type Props = {
  open: boolean;
  onClose: () => void;
};

function alertCopy(result: SyncResult | null): { en: string; zh: string } | null {
  if (result === "denied") return REMINDER_ANDROID_DENIED;
  if (result === "exact-denied") return REMINDER_ANDROID_EXACT;
  if (result === "failed") return REMINDER_ANDROID_FAILED;
  return null;
}

/**
 * The only daily-reminder form.
 * Web delivery stays on enableDailyReminder / disableDailyReminder.
 * The Android shell stays on armNativeReminder, which asks before it schedules.
 */
export function SettingsSheet({ open, onClose }: Props) {
  const reminder = useReminderSettings();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [native, setNative] = useState(() => isAndroidShell());
  const [problem, setProblem] = useState<SyncResult | null>(null);
  const [webProblem, setWebProblem] = useState<"denied" | "unavailable" | null>(null);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const time = draftTime ?? reminder.time;

  useEffect(() => {
    setNative(isAndroidShell());
    return reminderArmListener((detail) => {
      setProblem(detail.result === "off" || detail.result === "skipped" ? null : detail.result);
    });
  }, []);

  useEffect(() => {
    if (draftTime && reminder.time === draftTime) setDraftTime(null);
  }, [draftTime, reminder.time]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  async function apply(next: { enabled: boolean; time: string }) {
    const parsed = parseReminderTime(next.time) ?? reminder.time;
    setDraftTime(parsed);
    if (isAndroidShell()) {
      const turningOn = next.enabled && !reminder.enabled;
      const result = await armNativeReminder({ enabled: next.enabled, time: parsed, test: turningOn });
      setProblem(result === "off" || result === "skipped" ? null : result);
      setWebProblem(null);
      void publishPracticeSnapshot();
      return;
    }
    setProblem(null);
    if (!next.enabled) {
      if (parsed !== reminder.time) {
        const storage = practiceLocalStorage();
        if (storage) saveReminderSettings(storage, { enabled: false, time: parsed });
      } else {
        disableDailyReminder();
      }
      setWebProblem(null);
      return;
    }
    const result = await enableDailyReminder(parsed);
    if (result.ok) setWebProblem(null);
    else if (result.reason === "denied") setWebProblem("denied");
    else setWebProblem("unavailable");
  }

  if (!open) return null;

  const alert = native ? alertCopy(problem) : null;
  const on = native && reminder.enabled && problem !== "denied" && problem !== "exact-denied" && problem !== "failed";
  const note = native
    ? "idle"
    : openReminderNote({
        enabled: reminder.enabled,
        slotPassed: reminderSlotPassed(time),
        handledToday: reminder.lastDailyDay === localDateKey(new Date()),
        problem: webProblem,
      });

  return (
    <div className="settings-backdrop" onMouseDown={onClose}>
      <section
        className="settings-sheet"
        id="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-head">
          <h2 id="settings-title">
            Settings <small>设置</small>
          </h2>
          <button type="button" className="settings-close" id="settings-close" onClick={onClose}>
            <b>Close</b>
            <small>关闭</small>
          </button>
        </div>
        <ReminderControl enabled={native ? on : reminder.enabled} time={time} note={note} onChange={(next) => void apply(next)} />
        {on ? (
          <p className="reminder-alert is-on" id="reminder-android-note" role="status">
            <b>{REMINDER_ANDROID_ON.en}</b>
            <small>{REMINDER_ANDROID_ON.zh}</small>
            <span>{REMINDER_ANDROID_BATTERY.en}</span>
            <small>{REMINDER_ANDROID_BATTERY.zh}</small>
          </p>
        ) : null}
        {alert ? (
          <p className="reminder-alert" id="reminder-android-note" role="alert">
            <b>{alert.en}</b>
            <small>{alert.zh}</small>
          </p>
        ) : null}
      </section>
    </div>
  );
}
