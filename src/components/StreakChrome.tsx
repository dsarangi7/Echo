import { useEffect, useState } from "react";
import { disableDailyReminder, enableDailyReminder } from "../practice/reminder-runtime";
import { reminderSlotPassed, saveReminderSettings } from "../practice/reminder";
import { localDateKey } from "../practice/shanghai";
import { STREAK_CHANGED_EVENT, practiceLocalStorage, type StreakMilestone } from "../practice/streak";
import type { Lang } from "../practice/types";
import { usePracticeStreak, useReminderSettings } from "../practice/usePracticeSignals";
import { milestoneJustHit, openReminderNote } from "../ui/streakCopy";
import { MilestoneToast } from "./MilestoneToast";
import { ReminderControl } from "./ReminderControl";
import { StreakFlame } from "./StreakFlame";

type Props = {
  lang: Lang;
};

/**
 * Visual chrome only.
 * Streak numbers come from usePracticeStreak().
 * The toggle calls enableDailyReminder / disableDailyReminder.
 * The toast opens from Kai's one-shot milestoneJustHit. This file does not count days.
 */
export function StreakChrome({ lang }: Props) {
  const streak = usePracticeStreak();
  const reminder = useReminderSettings();
  const [toast, setToast] = useState<StreakMilestone | null>(null);
  const [problem, setProblem] = useState<"denied" | "unavailable" | null>(null);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const time = draftTime ?? reminder.time;
  const note = openReminderNote({
    enabled: reminder.enabled,
    slotPassed: reminderSlotPassed(time),
    handledToday: reminder.lastDailyDay === localDateKey(new Date()),
    problem,
  });

  useEffect(() => {
    const onStreak = (event: Event) => {
      const hit = milestoneJustHit(event);
      if (hit) setToast(hit);
    };
    window.addEventListener(STREAK_CHANGED_EVENT, onStreak);
    return () => window.removeEventListener(STREAK_CHANGED_EVENT, onStreak);
  }, []);

  useEffect(() => {
    if (draftTime && reminder.time === draftTime) setDraftTime(null);
  }, [draftTime, reminder.time]);

  async function change(next: { enabled: boolean; time: string }) {
    setDraftTime(next.time);
    if (!next.enabled) {
      if (next.time !== reminder.time) {
        const storage = practiceLocalStorage();
        if (storage) saveReminderSettings(storage, { enabled: false, time: next.time });
      } else {
        disableDailyReminder();
      }
      setProblem(null);
      return;
    }
    const result = await enableDailyReminder(next.time);
    if (result.ok) setProblem(null);
    else if (result.reason === "denied") setProblem("denied");
    else setProblem("unavailable");
  }

  return (
    <section className="streak-chrome" id="streak-chrome" aria-label="Practice streak and daily reminder. 连续练习和每天提醒">
      <StreakFlame current={streak.current} best={streak.best} />
      <ReminderControl enabled={reminder.enabled} time={time} note={note} onChange={(next) => void change(next)} />
      {toast ? <MilestoneToast day={toast} lang={lang} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
