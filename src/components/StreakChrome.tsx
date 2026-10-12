import { useEffect, useState } from "react";
import { STREAK_CHANGED_EVENT, type StreakMilestone } from "../practice/streak";
import type { Lang } from "../practice/types";
import { usePracticeStreak } from "../practice/usePracticeSignals";
import { milestoneJustHit } from "../ui/streakCopy";
import { MilestoneToast } from "./MilestoneToast";
import { StreakFlame } from "./StreakFlame";

type Props = {
  lang: Lang;
};

/**
 * Thin streak chip on the practice card.
 * Numbers come from usePracticeStreak(). The toast opens from milestoneJustHit.
 * The daily reminder lives in Settings, not here.
 */
export function StreakChrome({ lang }: Props) {
  const streak = usePracticeStreak();
  const [toast, setToast] = useState<StreakMilestone | null>(null);

  useEffect(() => {
    const onStreak = (event: Event) => {
      const hit = milestoneJustHit(event);
      if (hit) setToast(hit);
    };
    window.addEventListener(STREAK_CHANGED_EVENT, onStreak);
    return () => window.removeEventListener(STREAK_CHANGED_EVENT, onStreak);
  }, []);

  return (
    <section className="streak-chrome" id="streak-chrome" aria-label="Practice streak. 连续练习">
      <StreakFlame current={streak.current} best={streak.best} />
      {toast ? <MilestoneToast day={toast} lang={lang} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
