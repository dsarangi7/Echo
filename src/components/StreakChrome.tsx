import { useEffect, useState } from "react";
import { STREAK_CHANGED_EVENT, type StreakMilestone } from "../practice/streak";
import type { SessionTally } from "../practice/session";
import type { Lang } from "../practice/types";
import { usePracticeStreak } from "../practice/usePracticeSignals";
import { milestoneJustHit } from "../ui/streakCopy";
import { MilestoneToast } from "./MilestoneToast";
import { StreakFlame } from "./StreakFlame";

type Props = {
  lang: Lang;
  session: SessionTally;
};

/**
 * Day streak under the session tally.
 * Shown once today has a Clear, the day is complete, or a day streak is still alive.
 * Numbers come from usePracticeStreak(). The toast opens from milestoneJustHit.
 * The daily reminder lives in Settings, not here.
 */
export function StreakChrome({ lang, session }: Props) {
  const streak = usePracticeStreak();
  const [toast, setToast] = useState<StreakMilestone | null>(null);
  // This visit's combo is not the day streak. The stored day task is.
  void session;
  const visible = streak.todayClears > 0 || streak.dayComplete || streak.current > 0;

  useEffect(() => {
    if (!visible) return;
    const onStreak = (event: Event) => {
      const hit = milestoneJustHit(event);
      if (hit) setToast(hit);
    };
    window.addEventListener(STREAK_CHANGED_EVENT, onStreak);
    return () => window.removeEventListener(STREAK_CHANGED_EVENT, onStreak);
  }, [visible]);

  if (!visible) return null;

  return (
    <section className="streak-chrome streak-footer" id="streak-chrome" aria-label="Practice streak. 连续练习">
      <StreakFlame
        current={streak.current}
        best={streak.best}
        todayClears={streak.todayClears}
        goal={streak.goal}
        dayComplete={streak.dayComplete}
      />
      {toast ? <MilestoneToast day={toast} lang={lang} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
