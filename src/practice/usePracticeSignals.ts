import { useEffect, useState } from "react";
import { REMINDER_CHANGED_EVENT, loadReminder, type ReminderState } from "./reminder";
import { STREAK_CHANGED_EVENT, loadStreak, practiceLocalStorage, type StreakView } from "./streak";

function zeroStreak(): StreakView {
  return {
    current: 0,
    best: 0,
    lastPracticeDay: null,
    practiceDays: [],
    practicedToday: false,
    daysThisWeek: 0,
    milestone: null,
  };
}

/** Live streak for Chan's badge. Updates after a counted Say it, and when a Shanghai day rolls over. */
export function usePracticeStreak(): StreakView {
  const [view, setView] = useState<StreakView>(() => {
    const storage = practiceLocalStorage();
    return storage ? loadStreak(storage) : zeroStreak();
  });

  useEffect(() => {
    const refresh = () => {
      const storage = practiceLocalStorage();
      setView(storage ? loadStreak(storage) : zeroStreak());
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener(STREAK_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(STREAK_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return view;
}

/** Saved reminder time and enabled flag. `time` is HH:MM on this device. Streak days stay Asia/Shanghai. */
export function useReminderSettings(): ReminderState {
  const [state, setState] = useState<ReminderState>(() => loadReminder(practiceLocalStorage()));

  useEffect(() => {
    const refresh = () => setState(loadReminder(practiceLocalStorage()));
    window.addEventListener(REMINDER_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(REMINDER_CHANGED_EVENT, refresh);
  }, []);

  return state;
}
