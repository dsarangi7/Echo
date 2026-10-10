import { useState } from "react";
import { getReminder, getStreak, type ReminderPreference, type StreakSummary } from "../streak";
import type { Lang } from "../practice/types";
import { readStreakPreview, visibleMilestone } from "../ui/streakCopy";
import { saveReminderPreference } from "../ui/streakActions";
import { MilestoneToast } from "./MilestoneToast";
import { ReminderControl } from "./ReminderControl";
import { StreakFlame } from "./StreakFlame";

type Props = {
  lang: Lang;
  /** Pass through once Kai owns the values. Omit to read the streak module. */
  streak?: StreakSummary;
  reminder?: ReminderPreference;
  onReminderChange?: (next: ReminderPreference) => void | Promise<void>;
};

function safeSearch(): string {
  try {
    if (typeof location === "undefined") return "";
    return location.search ?? "";
  } catch {
    return "";
  }
}

function previewStreak(): StreakSummary | null {
  if (!import.meta.env.DEV) return null;
  return readStreakPreview(safeSearch());
}

/**
 * Visual chrome only. Reads getStreak / getReminder and writes setReminder.
 * Does not call recordPracticeClearOrPartial and does not count Shanghai days.
 */
export function StreakChrome({ lang, streak, reminder, onReminderChange }: Props) {
  const [localReminder, setLocalReminder] = useState(getReminder);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const shownReminder = reminder ?? localReminder;
  const shownStreak = streak ?? previewStreak() ?? getStreak();
  const day = visibleMilestone(shownStreak.current, dismissed);

  async function change(next: ReminderPreference) {
    if (onReminderChange) {
      await onReminderChange(next);
      return;
    }
    await saveReminderPreference(next);
    setLocalReminder(getReminder());
  }

  return (
    <section className="streak-chrome" id="streak-chrome" aria-label="Practice streak and daily reminder. 连续练习和每天提醒">
      <StreakFlame current={shownStreak.current} best={shownStreak.best} />
      <ReminderControl
        enabled={shownReminder.enabled}
        hour={shownReminder.hour}
        minute={shownReminder.minute}
        onChange={(next) => void change(next)}
      />
      {day ? <MilestoneToast day={day} lang={lang} onDismiss={() => setDismissed(day)} /> : null}
    </section>
  );
}
