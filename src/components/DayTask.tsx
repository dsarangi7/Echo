import type { StreakView } from "../practice/streak";

type Props = {
  view: StreakView;
};

/** Compact day task. Hidden until today has a Clear, or a day streak is already going. */
export function DayTask({ view }: Props) {
  const active = view.todayClears > 0 || view.dayComplete || view.current > 0;
  if (!active) return null;
  const shown = Math.min(view.todayClears, view.goal);
  const fire = view.dayComplete;
  const label = fire
    ? `Day complete. ${view.current} day streak. 今天完成。连续 ${view.current} 天。`
    : `${shown} of ${view.goal} clear matches today. 今天 ${shown}/${view.goal}。`;

  return (
    <p className={fire ? "day-task is-complete" : "day-task"} id="day-task" role="status" aria-label={label}>
      <b>{fire ? `🔥 ${view.current}` : `${shown}/${view.goal}`}</b>
      <span>{fire ? "Day complete" : "today"}</span>
      <small>{fire ? "今天完成" : "今天"}</small>
    </p>
  );
}
